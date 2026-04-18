"""
TheraAI — Dependency Health Check
Verifies all services needed for a demo are running.

Usage:
    cd backend
    python scripts/check_deps.py
"""

import sys
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

RED   = "\033[91m"
GREEN = "\033[92m"
RESET = "\033[0m"
BOLD  = "\033[1m"


def ok(label: str, msg: str = ""):
    print(f"  {GREEN}✅{RESET} {label:<20} {msg}")


def fail(label: str, msg: str = ""):
    print(f"  {RED}❌{RESET} {label:<20} {msg}")


async def check_mongodb():
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=3000)
        await client.admin.command("ping")
        client.close()
        ok("MongoDB", f"reachable at {url}")
        return True
    except Exception as e:
        fail("MongoDB", f"NOT reachable — {e}")
        return False


async def check_ollama():
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("http://localhost:11434/api/tags")
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            has_llama = any("llama3.1" in m for m in models)
            if has_llama:
                ok("Ollama", f"running, llama3.1:8b available")
            else:
                fail("Ollama", f"running but llama3.1:8b not found — run: ollama pull llama3.1:8b")
            return has_llama
    except Exception as e:
        fail("Ollama", f"NOT running — {e}\n             Run: ollama serve")
        return False


async def check_fastapi():
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("http://localhost:8000/health")
            if r.status_code == 200:
                ok("FastAPI", "/health → 200")
                return True
            else:
                fail("FastAPI", f"/health → {r.status_code}")
                return False
    except Exception as e:
        fail("FastAPI", f"NOT running on :8000 — {e}")
        return False


async def check_react():
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("http://localhost:3000")
            if r.status_code < 400:
                ok("React", "http://localhost:3000 → OK")
                return True
            else:
                fail("React", f"http://localhost:3000 → {r.status_code}")
                return False
    except Exception as e:
        fail("React", f"NOT running on :3000 — {e}")
        return False


async def main():
    print(f"\n{BOLD}TheraAI — Service Health Check{RESET}")
    print("─" * 45)

    results = await asyncio.gather(
        check_mongodb(),
        check_ollama(),
        check_fastapi(),
        check_react(),
    )

    passed = sum(results)
    total  = len(results)
    print("─" * 45)
    if passed == total:
        print(f"\n{GREEN}{BOLD}All {total} services healthy — ready to demo!{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}{BOLD}{total - passed}/{total} services unhealthy — fix above before demo.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
