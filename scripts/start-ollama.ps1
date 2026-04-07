# start-ollama.ps1
# Starts the Ollama daemon if it is not already running.
# Run once manually, or register as a Windows startup task using the instructions below.
#
# ── REGISTER AS WINDOWS STARTUP TASK (run once in PowerShell as Administrator) ──
#
#   $action  = New-ScheduledTaskAction -Execute "powershell.exe" `
#                -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSScriptRoot\start-ollama.ps1`""
#   $trigger = New-ScheduledTaskTrigger -AtLogon
#   $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0)
#   Register-ScheduledTask -TaskName "OllamaAutoStart" `
#     -Action $action -Trigger $trigger -Settings $settings `
#     -RunLevel Highest -Force
#   Write-Host "Registered: Ollama will now start automatically at login."
#
# ── TO REMOVE THE STARTUP TASK ────────────────────────────────────────────────
#   Unregister-ScheduledTask -TaskName "OllamaAutoStart" -Confirm:$false
#
# ─────────────────────────────────────────────────────────────────────────────

$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

# Fallback: check PATH
if (-not (Test-Path $ollamaExe)) {
    $ollamaExe = (Get-Command ollama -ErrorAction SilentlyContinue)?.Source
}

if (-not $ollamaExe) {
    Write-Error "Ollama not found. Install from https://ollama.ai/download"
    exit 1
}

# Check if ollama is already serving
$running = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    $running = $true
} catch {
    $running = $false
}

if ($running) {
    Write-Host "Ollama is already running on port 11434."
    exit 0
}

Write-Host "Starting Ollama daemon..."
Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden -PassThru | Out-Null

# Wait up to 10 seconds for it to become ready
$maxWait = 10
$waited  = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    try {
        Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 1 -ErrorAction Stop | Out-Null
        Write-Host "Ollama is ready (started in ${waited}s)."
        exit 0
    } catch {}
}

Write-Warning "Ollama started but did not respond within ${maxWait}s. It may still be loading the model."
