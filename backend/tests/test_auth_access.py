import pytest

import auth


@pytest.fixture()
def isolated_auth_db(monkeypatch, tmp_path):
    db_path = tmp_path / "auth_test.db"
    monkeypatch.setattr(auth, "DB_NAME", str(db_path))
    auth.init_auth_tables()
    return db_path


def test_default_admin_seeded_with_full_access(isolated_auth_db):
    admin = auth.login_with_credentials("Admin", "Admin")
    assert admin is not None
    assert admin["requested_access"] == "ALL"
    assert auth.is_admin(admin["app_id"]) is True


def test_login_does_not_rotate_api_key(isolated_auth_db):
    first = auth.login_with_credentials("Admin", "Admin")
    second = auth.login_with_credentials("Admin", "Admin")
    assert first is not None and second is not None
    assert first["api_key"] == second["api_key"]


def test_rotate_replaces_api_key_in_db(isolated_auth_db):
    session = auth.login_with_credentials("Admin", "Admin")
    assert session is not None
    old_key = session["api_key"]

    new_key = auth.rotate_api_key(session["app_id"])
    assert new_key is not None
    assert new_key != old_key

    assert auth.validate_api_key(old_key) is None
    assert auth.validate_api_key(new_key) is not None


def test_requested_access_persists_for_registered_user(isolated_auth_db):
    created = auth.register_user(
        username="AgentUser1",
        password="pass1234",
        requested_access="AGENT_EVAL",
        owner_email="agent@example.com",
    )
    assert created["requested_access"] == "AGENT_EVAL"

    session = auth.login_with_credentials("AgentUser1", "pass1234")
    assert session is not None
    assert session["requested_access"] == "AGENT_EVAL"
    assert auth.is_admin(session["app_id"]) is False


def test_has_app_access_logic(isolated_auth_db):
    assert auth.has_app_access({"requested_access": "ALL"}, "RAG_EVAL") is True
    assert auth.has_app_access({"requested_access": "AGENT_EVAL"}, "AGENT_EVAL") is True
    assert auth.has_app_access({"requested_access": "AGENT_EVAL"}, "RAG_EVAL") is False
