"""Seepsight API entry point for the Jira Forge integration."""

import os
from functools import lru_cache

import firebase_admin
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from .forge_auth import FitValidationError, ForgeIdentity, validate_forge_token
from .tenant import TenantAccessError, resolve_active_membership
from .pairing import PairingError, redeem_pairing_code, revoke_jira_link
from .workspace import WorkspaceDataError, get_overview, list_analyses


app = FastAPI(
    title="Seepsight Jira Integration API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)

# requestRemote calls the API directly from Jira Cloud's browser context.
# CORS only controls browser access; FIT validation remains mandatory.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.atlassian\.net|[a-zA-Z0-9-]+\.apps\.atlassian\.net)$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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


class PairingRequest(BaseModel):
    code: str = Field(min_length=24, max_length=160)


@app.post("/api/v1/jira/link")
def create_jira_link(
    payload: PairingRequest,
    identity: ForgeIdentity = Depends(_identity),
):
    """Redeem a Seepsight-issued one-time pairing code for this Jira identity."""
    try:
        membership = redeem_pairing_code(
            _firestore_client(),
            _firebase_auth_client(),
            identity.cloud_id,
            identity.account_id,
            identity.installation_id,
            payload.code,
            actor_account_id=identity.actor_account_id,
        )
    except PairingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account linking is temporarily unavailable.",
        ) from exc

    return {
        "linked": True,
        "company_name": membership["company_name"],
        "role": membership["role"],
    }


@app.delete("/api/v1/jira/link")
def delete_jira_link(
    identity: ForgeIdentity = Depends(_identity),
):
    """Disconnect the current Atlassian user from the linked Seepsight account."""
    try:
        revoked = revoke_jira_link(
            _firestore_client(),
            identity.cloud_id,
            identity.account_id,
            identity.installation_id,
            actor_account_id=identity.actor_account_id,
        )
    except PairingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account disconnection is temporarily unavailable.",
        ) from exc

    return {"linked": False, "revoked": revoked}


def _verified_membership(identity: ForgeIdentity) -> dict:
    try:
        return resolve_active_membership(
            _firestore_client(),
            _firebase_auth_client(),
            identity.cloud_id,
            identity.account_id,
        )
    except TenantAccessError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Seepsight identity verification is temporarily unavailable.",
        ) from exc


@app.get("/api/v1/jira/overview")
def jira_overview(identity: ForgeIdentity = Depends(_identity)):
    """Return the linked company's latest completed analysis summary."""
    membership = _verified_membership(identity)
    try:
        return get_overview(_firestore_client(), membership, identity)
    except WorkspaceDataError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The Seepsight overview is temporarily unavailable.",
        ) from exc


@app.get("/api/v1/jira/analyses")
def jira_analyses(
    limit: int = 20,
    identity: ForgeIdentity = Depends(_identity),
):
    """Return a bounded list of completed analysis summaries for this company."""
    membership = _verified_membership(identity)
    try:
        return list_analyses(_firestore_client(), membership, identity, limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The Seepsight analysis list is temporarily unavailable.",
        ) from exc
