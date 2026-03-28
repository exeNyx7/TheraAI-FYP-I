# TheraAI - AI Chatbot Quick Install Script
# Run this script to install all AI dependencies

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TheraAI - AI Chatbot Installation" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Check if we're in the backend directory
if (-not (Test-Path "app/services/ai_service.py")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected: .../TheraAI-FYP-I/backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Detected backend directory`n" -ForegroundColor Green

# Step 1: Check Python version
Write-Host "📋 Step 1: Checking Python version..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "   $pythonVersion" -ForegroundColor Gray

if ($pythonVersion -match "Python 3\.([0-9]+)") {
    $minorVersion = [int]$matches[1]
    if ($minorVersion -lt 10) {
        Write-Host "❌ Python 3.10+ required (found $pythonVersion)" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✅ Python version OK`n" -ForegroundColor Green

# Step 2: Check CUDA availability
Write-Host "📋 Step 2: Checking for NVIDIA GPU..." -ForegroundColor Yellow
try {
    $nvidiaInfo = nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ GPU Detected:" -ForegroundColor Green
        Write-Host "   $nvidiaInfo`n" -ForegroundColor Gray
        $hasGPU = $true
    } else {
        throw "nvidia-smi not found"
    }
} catch {
    Write-Host "   ⚠️  No NVIDIA GPU detected - will use CPU mode (slower)" -ForegroundColor Yellow
    Write-Host "   Note: CPU mode works but is 10-30x slower`n" -ForegroundColor Gray
    $hasGPU = $false
}

# Step 3: Determine CUDA version
if ($hasGPU) {
    Write-Host "📋 Step 3: Detecting CUDA version..." -ForegroundColor Yellow
    $cudaVersion = nvidia-smi | Select-String "CUDA Version: ([0-9]+\.[0-9]+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    if ($cudaVersion) {
        Write-Host "   ✅ CUDA Version: $cudaVersion" -ForegroundColor Green
        
        $cudaMajor = [int]($cudaVersion -split '\.')[0]
        
        if ($cudaMajor -ge 12) {
            $torchIndex = "https://download.pytorch.org/whl/cu121"
            Write-Host "   📦 Will install PyTorch with CUDA 12.1 support`n" -ForegroundColor Cyan
        } elseif ($cudaMajor -eq 11) {
            $torchIndex = "https://download.pytorch.org/whl/cu118"
            Write-Host "   📦 Will install PyTorch with CUDA 11.8 support`n" -ForegroundColor Cyan
        } else {
            Write-Host "   ⚠️  CUDA version $cudaVersion may not be supported" -ForegroundColor Yellow
            Write-Host "   Defaulting to CUDA 12.1`n" -ForegroundColor Gray
            $torchIndex = "https://download.pytorch.org/whl/cu121"
        }
    } else {
        Write-Host "   ⚠️  Could not detect CUDA version, defaulting to CUDA 12.1`n" -ForegroundColor Yellow
        $torchIndex = "https://download.pytorch.org/whl/cu121"
    }
} else {
    Write-Host "📋 Step 3: CUDA not available - will use CPU version`n" -ForegroundColor Yellow
    $torchIndex = $null
}

# Step 4: Install PyTorch
Write-Host "📋 Step 4: Installing PyTorch..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes..." -ForegroundColor Gray

if ($torchIndex) {
    Write-Host "   Command: pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url $torchIndex" -ForegroundColor Gray
    pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url $torchIndex
} else {
    Write-Host "   Command: pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1" -ForegroundColor Gray
    pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to install PyTorch" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ PyTorch installed successfully`n" -ForegroundColor Green

# Step 5: Install Transformers and dependencies
Write-Host "📋 Step 5: Installing Transformers and AI libraries..." -ForegroundColor Yellow
Write-Host "   Command: pip install transformers accelerate sentencepiece pytz" -ForegroundColor Gray

pip install transformers==4.35.0 accelerate==0.25.0 sentencepiece==0.1.99 pytz==2024.2

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to install AI libraries" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ AI libraries installed successfully`n" -ForegroundColor Green

# Step 6: Verify installation
Write-Host "📋 Step 6: Verifying installation..." -ForegroundColor Yellow

$verifyScript = @"
import torch
import transformers
print(f'✅ PyTorch version: {torch.__version__}')
print(f'✅ Transformers version: {transformers.__version__}')
print(f'✅ CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'✅ GPU: {torch.cuda.get_device_name(0)}')
    print(f'✅ CUDA version: {torch.version.cuda}')
    compute_cap = torch.cuda.get_device_capability(0)
    print(f'✅ Compute capability: sm_{compute_cap[0]}{compute_cap[1]}')
    
    # Check for very new GPU architecture compatibility issue
    if compute_cap[0] >= 12:
        print(f'\n⚠️  WARNING: Your GPU has compute capability sm_{compute_cap[0]}{compute_cap[1]}')
        print(f'⚠️  PyTorch {torch.__version__} does not support this GPU (max sm_90)')
        print(f'⚠️  The AI service will automatically fall back to CPU mode')
        print(f'\n💡 To enable GPU support for this GPU:')
        print(f'   pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128')
        print(f'\n📝 Note: CPU mode works but is slower (10-30s per response)')
"@

Write-Host "   Running verification..." -ForegroundColor Gray
python -c $verifyScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Verification had issues but installation may still work" -ForegroundColor Yellow
} else {
    Write-Host "`n   ✅ Installation verified successfully" -ForegroundColor Green
}

# Step 7: Information about first run
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  🎉 Installation Complete!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "⚠️  IMPORTANT: First Run Information" -ForegroundColor Yellow
Write-Host "   • First time running will download AI models (~2GB)" -ForegroundColor Gray
Write-Host "   • This will take 5-10 minutes depending on internet speed" -ForegroundColor Gray
Write-Host "   • Models are cached and won't re-download" -ForegroundColor Gray
Write-Host "   • Subsequent runs will be much faster (~10-15 seconds)`n" -ForegroundColor Gray

Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test AI service:" -ForegroundColor White
Write-Host "      python test_ai_service.py`n" -ForegroundColor Gray
Write-Host "   2. Start backend server:" -ForegroundColor White
Write-Host "      uvicorn app.main:app --reload`n" -ForegroundColor Gray
Write-Host "   3. Access API docs:" -ForegroundColor White
Write-Host "      http://localhost:8000/docs`n" -ForegroundColor Gray

if ($hasGPU) {
    Write-Host "🎮 GPU Configuration:" -ForegroundColor Cyan
    Write-Host "   • System will auto-detect RTX 4060 or RTX 3070" -ForegroundColor Gray
    Write-Host "   • RTX 3070: Mixed precision (FP16), 10 message history" -ForegroundColor Gray
    Write-Host "   • RTX 4060: Half precision (FP16), 6 message history" -ForegroundColor Gray
    Write-Host "   • No manual configuration needed`n" -ForegroundColor Gray
} else {
    Write-Host "🖥️  CPU Mode:" -ForegroundColor Cyan
    Write-Host "   • AI will work but responses will take 10-30 seconds" -ForegroundColor Gray
    Write-Host "   • Consider using a machine with NVIDIA GPU for better performance`n" -ForegroundColor Gray
}

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • Setup Guide: docs/AI_SETUP_GUIDE.md" -ForegroundColor Gray
Write-Host "   • Implementation Plan: docs/AI_CHATBOT_INTEGRATION_PLAN.md" -ForegroundColor Gray
Write-Host "   • Summary: docs/AI_IMPLEMENTATION_SUMMARY.md`n" -ForegroundColor Gray

Write-Host "============================================================`n" -ForegroundColor Cyan
