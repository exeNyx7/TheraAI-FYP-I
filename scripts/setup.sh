#!/usr/bin/env bash
# =============================================================================
# TheraAI — One-Command Setup Script (Linux / macOS)
# =============================================================================
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# =============================================================================

set -e

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step() { echo -e "\n${CYAN}[→] $1${NC}"; }
ok()   { echo -e "${GREEN}[✓] $1${NC}"; }
warn() { echo -e "${YELLOW}[!] $1${NC}"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }

echo -e "${CYAN}"
echo "╔══════════════════════════════════════╗"
echo "║      TheraAI Setup — Linux/macOS    ║"
echo "╚══════════════════════════════════════╝${NC}"

# ---------------------------------------------------------------------------
# 0. Check prerequisites
# ---------------------------------------------------------------------------
step "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || err "Python 3.10+ is required. Install from https://python.org"
PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "  Python: $PYVER"

command -v node >/dev/null 2>&1 || err "Node.js 18+ is required. Install from https://nodejs.org"
NODEVER=$(node --version)
echo "  Node:   $NODEVER"

command -v npm >/dev/null 2>&1 || err "npm is required (usually installed with Node.js)"

if ! command -v mongod >/dev/null 2>&1; then
    warn "MongoDB not found locally. You can use Docker instead: docker-compose up -d mongodb"
fi

ok "Prerequisites OK"

# ---------------------------------------------------------------------------
# 1. Backend .env
# ---------------------------------------------------------------------------
step "Setting up backend/.env..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    # Generate a random secret key
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/REPLACE_ME_WITH_A_64_CHAR_RANDOM_HEX_STRING/$SECRET/" backend/.env
    else
        sed -i "s/REPLACE_ME_WITH_A_64_CHAR_RANDOM_HEX_STRING/$SECRET/" backend/.env
    fi
    ok "backend/.env created with auto-generated SECRET_KEY"
else
    warn "backend/.env already exists — skipping"
fi

# ---------------------------------------------------------------------------
# 2. Frontend .env
# ---------------------------------------------------------------------------
step "Setting up web/.env..."

if [ ! -f web/.env ]; then
    cp web/.env.example web/.env
    ok "web/.env created"
else
    warn "web/.env already exists — skipping"
fi

# ---------------------------------------------------------------------------
# 3. Python virtual environment + dependencies
# ---------------------------------------------------------------------------
step "Setting up Python virtual environment..."

if [ ! -d backend/venv ]; then
    python3 -m venv backend/venv
    ok "venv created at backend/venv"
else
    warn "venv already exists — skipping creation"
fi

# Activate venv
source backend/venv/bin/activate

step "Installing Python dependencies (this may take a few minutes)..."
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q
ok "Python dependencies installed"

# ---------------------------------------------------------------------------
# 4. Node.js dependencies
# ---------------------------------------------------------------------------
step "Installing Node.js dependencies..."
cd web && npm install && cd ..
ok "Node.js dependencies installed"

# ---------------------------------------------------------------------------
# 5. Seed database (optional)
# ---------------------------------------------------------------------------
step "Seeding database with test data..."
read -p "  Seed the database with demo users and appointments? [y/N] " seed_confirm
if [[ "$seed_confirm" =~ ^[Yy]$ ]]; then
    python scripts/seed_db.py
    ok "Database seeded"
else
    warn "Skipped database seeding. Run later with: python scripts/seed_db.py"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
deactivate

echo -e "\n${GREEN}╔══════════════════════════════════════════╗"
echo "║          Setup Complete!                ║"
echo "╚══════════════════════════════════════════╝${NC}"
echo
echo "  Start backend:    cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  Start frontend:   cd web && npm run dev"
echo
echo "  Or with Docker:   docker-compose up --build"
echo
echo "  API docs:  http://localhost:8000/docs"
echo "  Frontend:  http://localhost:3000"
echo
echo "  Seed users password: TheraAI@2024"
