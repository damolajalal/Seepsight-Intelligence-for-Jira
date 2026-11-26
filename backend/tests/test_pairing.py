import pytest

from app.pairing import PairingError, pairing_code_hash


def test_pairing_code_is_hashed_and_never_returned_as_document_key():
    code = "a-secure-random-pairing-code-with-enough-entropy"
    digest = pairing_code_hash(code)
    assert digest != code
    assert len(digest) == 64
    assert digest == pairing_code_hash(code)


def test_pairing_code_hash_rejects_short_or_blank_input():
    for value in ("", "short", " " * 30):
        with pytest.raises(PairingError):
            pairing_code_hash(value)
