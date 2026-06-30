"""
Utility script to verify all required environment variables are set.
Run from the project root:
    python scripts/check_env.py
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_ENV = Path(__file__).parent.parent / "backend" / ".env"
FRONTEND_ENV = Path(__file__).parent.parent / "frontend" / ".env"

REQUIRED_BACKEND = [
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_JWT_SECRET",
    "SEC_USER_AGENT",
    "CHROMA_PATH",
]

REQUIRED_FRONTEND = [
    "VITE_API_BASE_URL",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
]


def check(env_file: Path, required: list[str], label: str) -> bool:
    load_dotenv(env_file, override=False)
    print(f"\n{label} ({env_file})")
    ok = True
    for key in required:
        val = os.getenv(key)
        if val and "your_" not in val.lower() and val != "":
            print(f"  ✅ {key}")
        else:
            print(f"  ❌ {key}  ← missing or placeholder")
            ok = False
    return ok


if __name__ == "__main__":
    all_ok = True
    all_ok &= check(BACKEND_ENV, REQUIRED_BACKEND, "Backend")
    all_ok &= check(FRONTEND_ENV, REQUIRED_FRONTEND, "Frontend")

    if all_ok:
        print("\n✅ All required env vars are set.")
    else:
        print("\n❌ Some env vars are missing. Copy .env.example → .env and fill them in.")
        raise SystemExit(1)
