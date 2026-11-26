import pytest

from app.forge_auth import FitValidationError, validate_forge_token


class SigningKey:
    key = "verified-key"


class FakeJwks:
    def get_signing_key_from_jwt(self, token):
        assert token == "signed-fit"
        return SigningKey()


def test_valid_fit_requires_signed_jira_context(monkeypatch):
    import app.forge_auth as module

    claims = {
        "app": {
            "id": "trusted-app-id",
            "installationId": "installation-123",
            "environment": {"id": "dev-environment"},
        },
        "context": {"cloudId": "jira-cloud-123"},
        "principal": "atlassian-account-456",
        "actorAccountId": "admin-account-789",
    }

    def fake_decode(token, key, **kwargs):
        assert token == "signed-fit"
        assert key == "verified-key"
        assert kwargs["audience"] == "trusted-app-id"
        assert kwargs["issuer"] == "forge/invocation-token"
        assert kwargs["algorithms"] == ["RS256"]
        return claims

    monkeypatch.setattr(module.jwt, "decode", fake_decode)

    identity = validate_forge_token("signed-fit", "trusted-app-id", FakeJwks())

    assert identity.cloud_id == "jira-cloud-123"
    assert identity.account_id == "atlassian-account-456"
    assert identity.installation_id == "installation-123"
    assert identity.app_id == "trusted-app-id"
    assert identity.actor_account_id == "admin-account-789"


def test_rejects_wrong_app_id(monkeypatch):
    import app.forge_auth as module

    monkeypatch.setattr(
        module.jwt,
        "decode",
        lambda *args, **kwargs: {
            "app": {"id": "attacker-app"},
            "context": {"cloudId": "cloud"},
            "principal": "account",
        },
    )

    with pytest.raises(FitValidationError):
        validate_forge_token("signed-fit", "trusted-app-id", FakeJwks())


def test_rejects_missing_principal(monkeypatch):
    import app.forge_auth as module

    monkeypatch.setattr(
        module.jwt,
        "decode",
        lambda *args, **kwargs: {
            "app": {"id": "trusted-app-id", "installationId": "install"},
            "context": {"cloudId": "cloud"},
        },
    )

    with pytest.raises(FitValidationError):
        validate_forge_token("signed-fit", "trusted-app-id", FakeJwks())
