"""Validate Atlassian Forge Invocation Tokens (FITs) for remote requests."""

from dataclasses import dataclass
from typing import Any

import jwt
from jwt import PyJWKClient


JWKS_URL = "https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json"
EXPECTED_ISSUER = "forge/invocation-token"


class FitValidationError(Exception):
    """Raised when a request does not carry a valid Forge identity."""


@dataclass(frozen=True)
class ForgeIdentity:
    app_id: str
    cloud_id: str
    account_id: str
    installation_id: str
    environment_id: str | None
    actor_account_id: str | None


def validate_forge_token(
    token: str,
    expected_app_id: str,
    jwks_client: Any | None = None,
) -> ForgeIdentity:
    """Verify signature and critical claims, then extract trusted Jira identity.

    The expected app ID must come from trusted service configuration, never
    from the token itself. This implementation targets Atlassian Commercial
    Cloud; Isolated Cloud requires its separately configured JWKS URL.
    """
    if not token or not isinstance(token, str):
        raise FitValidationError("Missing Forge Invocation Token.")
    if not expected_app_id:
        raise FitValidationError("Forge app identity is not configured.")

    try:
        client = jwks_client or PyJWKClient(JWKS_URL)
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=expected_app_id,
            issuer=EXPECTED_ISSUER,
            options={"require": ["exp", "iat", "nbf", "iss", "aud"]},
        )
    except Exception as exc:
        raise FitValidationError("Forge Invocation Token verification failed.") from exc

    app_claim = claims.get("app")
    context = claims.get("context")
    if not isinstance(app_claim, dict) or app_claim.get("id") != expected_app_id:
        raise FitValidationError("Forge app identity does not match this service.")
    if not isinstance(context, dict):
        raise FitValidationError("Forge Jira context is missing.")

    cloud_id = context.get("cloudId")
    account_id = claims.get("principal")
    installation_id = app_claim.get("installationId")

    if not all(isinstance(value, str) and value.strip() for value in (
        cloud_id, account_id, installation_id
    )):
        raise FitValidationError("The signed Forge token lacks Jira user or installation context.")

    environment = app_claim.get("environment")
    environment_id = environment.get("id") if isinstance(environment, dict) else None
    actor_account_id = claims.get("actorAccountId")

    return ForgeIdentity(
        app_id=expected_app_id,
        cloud_id=cloud_id,
        account_id=account_id,
        installation_id=installation_id,
        environment_id=environment_id if isinstance(environment_id, str) else None,
        actor_account_id=actor_account_id if isinstance(actor_account_id, str) else None,
    )
