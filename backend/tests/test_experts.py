import tempfile
from pathlib import Path

import pytest
from app.core import experts


def test_load_pool_not_empty():
    pool = experts.load_pool()
    assert isinstance(pool, dict)
    assert len(pool) > 0


def test_load_pool_ids_unique():
    pool = experts.load_pool()
    ids = [e["id"] for e in pool.values()]
    assert len(ids) == len(set(ids)), "전문가 ID에 중복이 있습니다"
    for k, v in pool.items():
        assert k == v["id"], f"키({k})와 전문가 id({v.get('id')})가 일치해야 합니다"


def test_expert_required_fields():
    pool = experts.load_pool()
    required_keys = {"id", "name", "use_for", "cluster", "accent"}
    for eid, e in pool.items():
        missing = required_keys - set(e.keys())
        assert not missing, f"전문가 {eid}에 필수 필드가 누락되었습니다: {missing}"
        assert e["id"], f"전문가 {eid}의 id가 비어 있습니다"
        assert e["name"], f"전문가 {eid}의 name이 비어 있습니다"
        assert e["use_for"], f"전문가 {eid}의 use_for가 비어 있습니다"
        assert e["cluster"], f"전문가 {eid}의 cluster가 비어 있습니다"
        assert e["accent"], f"전문가 {eid}의 accent가 비어 있습니다"


def test_all_experts_have_non_empty_guidance(monkeypatch):
    # 테스트가 저장소를 내려받지 않게 막는다. 이미 받아 둔 스킬만 확인한다.
    monkeypatch.setattr(experts, "_ensure_repo", lambda entry: None)
    pool = experts.load_pool()
    checked = 0
    for eid, e in pool.items():
        if e["entry"] is not None and not e["entry"].exists():
            continue
        checked += 1
        assert experts.guidance(e).strip(), f"전문가 {eid}의 기본 지침(guidance)이 비어 있습니다"
    assert checked > 0


@pytest.fixture
def multi_repo():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "repo"
        for rel in (
            "pptx/SKILL.md", "docx/SKILL.md",
            "marketing/marketing-instagram-curator.md", "product/product-nudge-engine.md",
            "SECURITY.md", "README.md", "integrations/cursor/marketing-instagram-curator.md",
        ):
            f = root / rel
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(f"# {f.stem}\nbody of {rel}", encoding="utf-8")
        yield root


def test_find_sub_skill_matches_identity_words(multi_repo):
    assert experts._find_sub_skill(multi_repo, "pptx slides").parent.name == "pptx"
    assert experts._find_sub_skill(multi_repo, "instagram reels content").name == "marketing-instagram-curator.md"


def test_find_sub_skill_prefers_rare_words_over_common_ones():
    # 흔한 단어 하나씩만 맞는 파일들이 동점이 되어 이름순 첫 파일이 뽑히던 오작동의 재발 방지
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for name in ("marketing-bilibili-content-strategist", "marketing-content-creator", "marketing-instagram-curator"):
            (root / f"{name}.md").write_text("x", encoding="utf-8")
        assert experts._find_sub_skill(root, "instagram content copywriter").name == "marketing-instagram-curator.md"


def test_find_sub_skill_skips_repo_docs_and_converted_outputs(multi_repo):
    picked = experts._find_sub_skill(multi_repo, "instagram")
    assert "integrations" not in picked.parts
    assert experts._find_sub_skill(multi_repo, "security vulnerability") is None


def test_find_sub_skill_ignores_korean_or_missing_terms(multi_repo):
    # 한국어를 영어로 바꾸는 일은 총괄(AI)이 한다. 매처는 키워드 사전을 갖지 않는다.
    assert experts._find_sub_skill(multi_repo, "") is None
    assert experts._find_sub_skill(multi_repo, "표 목표 대표 릴스 기획") is None


def test_guidance_uses_terms_for_directory_entry(multi_repo):
    e = {"id": "anthropic-skills", "entry": multi_repo}
    assert "pptx" in experts.guidance(e, "pptx").lower()
    assert "- pptx" in experts.guidance(e)  # 검색어가 없으면 하위 스킬 목록만 준다
