import os
import sys
from pathlib import Path
import pytest

# Ensure GON_LLM is set to stub before any imports
os.environ["GON_LLM"] = "stub"

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(autouse=True)
def guard_agy(monkeypatch):
    """테스트 중 실수로라도 실제 agy(Antigravity CLI)가 실행되지 않도록 차단."""
    import subprocess
    orig_run = subprocess.run

    def mock_run(args, *a, **kw):
        if isinstance(args, (list, tuple)) and any("agy" in str(x).lower() for x in args):
            raise RuntimeError("테스트 중 실제 agy 호출은 금지되어 있습니다.")
        return orig_run(args, *a, **kw)

    monkeypatch.setattr(subprocess, "run", mock_run)

