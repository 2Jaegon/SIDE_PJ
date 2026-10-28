import pytest
from app.core import llm


def test_decode_utf8_korean():
    text = "안녕하세요. 전국민 AI 평준화 Gon입니다."
    raw = text.encode("utf-8")
    assert llm._decode(raw) == text


def test_decode_cp949_korean():
    text = "안녕하세요. 전국민 AI 평준화 Gon입니다."
    raw = text.encode("cp949")
    assert llm._decode(raw) == text


def test_available_is_false_when_stub(monkeypatch):
    monkeypatch.setenv("GON_LLM", "stub")
    assert llm.available() is False

    monkeypatch.setenv("GON_LLM", "STUB")
    assert llm.available() is False


def test_available_respects_stub_even_with_agy_mocked(monkeypatch):
    monkeypatch.setenv("GON_LLM", "stub")
    monkeypatch.setattr(llm, "find_agy", lambda: "fake/path/to/agy")
    assert llm.available() is False

