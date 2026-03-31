@echo off
:: =============================================================================
:: TheraAI — One-Command Setup Script (Windows)
:: =============================================================================
:: Usage: scripts\setup.bat
:: Run from the repository root.
:: =============================================================================

setlocal enabledelayedexpansion
title TheraAI Setup

echo.
echo  ╔══════════════════════════════════════╗
echo  ║      TheraAI Setup — Windows        ║
echo  ╚══════════════════════════════════════╝
echo.

:: ---------------------------------------------------------------------------
:: 0. Check prerequisites
:: ---------------------------------------------------------------------------
echo [^>] Checking prerequisites...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python 3.10+ not found. Install from https://python.org
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo   %%i

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js 18+ not found. Install from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   Node: %%i

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm not found.
    pause & exit /b 1
)

echo [OK] Prerequisites checked.

:: ---------------------------------------------------------------------------
:: 1. Backend .env
:: ---------------------------------------------------------------------------
echo.
echo [^>] Setting up backend\.env...

if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    :: Generate secret key
    for /f %%i in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SECRET=%%i
    powershell -Command "(Get-Content backend\.env) -replace 'REPLACE_ME_WITH_A_64_CHAR_RANDOM_HEX_STRING', '%SECRET%' | Set-Content backend\.env"
    echo [OK] backend\.env created with auto-generated SECRET_KEY
) else (
    echo [!] backend\.env already exists — skipping
)

:: ---------------------------------------------------------------------------
:: 2. Frontend .env
:: ---------------------------------------------------------------------------
echo.
echo [^>] Setting up web\.env...

if not exist web\.env (
    copy web\.env.example web\.env >nul
    echo [OK] web\.env created
) else (
    echo [!] web\.env already exists — skipping
)

:: ---------------------------------------------------------------------------
:: 3. Python virtual environment + dependencies
:: ---------------------------------------------------------------------------
echo.
echo [^>] Setting up Python virtual environment...

if not exist backend\venv (
    python -m venv backend\venv
    echo [OK] venv created at backend\venv
) else (
    echo [!] venv already exists — skipping creation
)

call backend\venv\Scripts\activate.bat

echo.
echo [^>] Installing Python dependencies ^(this may take a few minutes^)...
pip install --upgrade pip -q
pip install -r backend\requirements.txt -q
echo [OK] Python dependencies installed.

:: ---------------------------------------------------------------------------
:: 4. Node.js dependencies
:: ---------------------------------------------------------------------------
echo.
echo [^>] Installing Node.js dependencies...
cd web
npm install
cd ..
echo [OK] Node.js dependencies installed.

:: ---------------------------------------------------------------------------
:: 5. Seed database
:: ---------------------------------------------------------------------------
echo.
echo [^>] Seed database with test data?
set /p seed_confirm="  Enter y to seed, or press Enter to skip [y/N]: "
if /i "!seed_confirm!"=="y" (
    python scripts\seed_db.py
    echo [OK] Database seeded.
) else (
    echo [!] Skipped. Run later: python scripts\seed_db.py
)

:: ---------------------------------------------------------------------------
:: Done
:: ---------------------------------------------------------------------------
call backend\venv\Scripts\deactivate.bat 2>nul

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║          Setup Complete!                ║
echo  ╚══════════════════════════════════════════╝
echo.
echo   Start backend:
echo     cd backend
echo     venv\Scripts\activate
echo     uvicorn app.main:app --reload
echo.
echo   Start frontend (new terminal):
echo     cd web
echo     npm run dev
echo.
echo   Or with Docker:
echo     docker-compose up --build
echo.
echo   API docs:  http://localhost:8000/docs
echo   Frontend:  http://localhost:3000
echo.
echo   Seed users password: TheraAI@2024
echo.

pause
