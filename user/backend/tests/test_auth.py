import time
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_tables

client = TestClient(app)

def setup_module():
    init_tables()

def test_auth_status():
    res = client.get("/api/auth/status")
    assert res.status_code == 200
    data = res.json()
    assert "mode" in data
    assert "project_ref" in data
    assert data["project_ref"] == "wdnyhnfooqmqlgtrdshn"
    assert "google_auth_configured" in data

def test_signup_and_login_flow():
    test_email = f"test_{int(time.time()*1000)}@example.com"
    test_password = "secure_password_123"

    # 1. 회원가입
    signup_res = client.post(
        "/api/auth/signup",
        json={"email": test_email, "password": test_password, "name": "테스터"}
    )
    assert signup_res.status_code == 200
    signup_data = signup_res.json()
    assert "token" in signup_data
    assert signup_data["user"]["email"] == test_email
    assert signup_data["user"]["name"] == "테스터"

    token = signup_data["token"]

    # 2. 내 정보 조회 (/api/auth/me)
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == test_email

    # 3. 로그인 (/api/auth/login)
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": test_password}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "token" in login_data
    assert login_data["user"]["email"] == test_email

    # 4. 잘못된 비밀번호로 로그인 실패
    bad_login = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "wrong_password"}
    )
    assert bad_login.status_code == 401

    # 5. 중복 가입 시도 실패
    dup_res = client.post(
        "/api/auth/signup",
        json={"email": test_email, "password": test_password}
    )
    assert dup_res.status_code == 409

def test_signup_validation():
    # 잘못된 이메일 형식
    res = client.post("/api/auth/signup", json={"email": "not-an-email", "password": "123456"})
    assert res.status_code == 400

    # 너무 짧은 비밀번호
    res2 = client.post("/api/auth/signup", json={"email": "good@example.com", "password": "123"})
    assert res2.status_code == 400

def test_me_unauthorized():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_google_login_flow():
    google_email = f"google_user_{int(time.time()*1000)}@gmail.com"

    # 1. Google 로그인 (신규 사용자 자동 생성)
    res = client.post(
        "/api/auth/google",
        json={
            "email": google_email,
            "name": "구글사용자",
            "picture": "https://lh3.googleusercontent.com/avatar_test"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == google_email
    assert data["user"]["name"] == "구글사용자"
    assert data["user"]["provider"] == "google"
    assert data["user"]["avatar_url"] == "https://lh3.googleusercontent.com/avatar_test"

    token = data["token"]

    # 2. 토큰으로 /api/auth/me 조회
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == google_email

    # 3. 동일 Google 계정으로 재로그인
    login_again = client.post("/api/auth/google", json={"email": google_email})
    assert login_again.status_code == 200
    assert login_again.json()["user"]["id"] == data["user"]["id"]

def test_google_login_validation():
    # 빈 요청 시 400
    res = client.post("/api/auth/google", json={})
    assert res.status_code == 400

    # 잘못된 이메일
    res2 = client.post("/api/auth/google", json={"email": "invalid-email"})
    assert res2.status_code == 400
