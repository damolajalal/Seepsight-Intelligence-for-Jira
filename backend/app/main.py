"""Seepsight API entry point for the Jira Forge integration."""

import os
from functools import lru_cache

import firebase_admin
from fastapi import Depends, FastAPI, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from .forge_auth import FitValidationError, ForgeIdentity, validate_forge_token
from .tenant import TenantAccessError, resolve_active_membership


app = FastAPI(
    title="Seepsight Jira Integration API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)


@lru_cache(maxsize=1)
def _firebase_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        # On Cloud Run, use the attached service identity / ADC. Do not ship
        # service-account JSON keys in the container or source repository.
        return firebase_admin.initialize_app()


def _firestore_client():
    return firestore.client(app=_firebase_app())


def _firebase_auth_client():
    return firebase_auth


def _identity(authorization: str | None = Header(default=None)) -> ForgeIdentity:
    expected_app_id = os.getenv("FORGE_APP_ID", "").strip()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Forge identity is required.")
    token = authorization[7:].strip()
    try:
        return validate_forge_token(token, expected_app_id)
    except FitValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@app.get("/healthz")
def healthz():
    """Non-sensitive container liveness check; does not expose dependency state."""
    return {"status": "ok", "service": "seepsight-jira-api", "version": "0.1.0"}


@app.get("/api/v1/jira/context")
def jira_context(
    identity: ForgeIdentity = Depends(_identity),
):
    """Return the linked company's safe display context for the signed-in Jira user."""
    try:
        membership = resolve_active_membership(
            _firestore_client(),
            _firebase_auth_client(),
            identity.cloud_id,
            identity.account_id,
        )
    except TenantAccessError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception as exc:
        # Fail closed without leaking Firestore or Firebase internals.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Seepsight identity verification is temporarily unavailable.",
        ) from exc

    return {
        "linked": True,
        "company_name": membership["company_name"],
        "role": membership["role"],
        "jira_site": identity.cloud_id,
    }
