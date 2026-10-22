# VoiceLink Build Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== Building VoiceLink Monorepo ===" -ForegroundColor Cyan

# 1. Build Backend
Write-Host "`n[1/2] Building Spring Boot Backend..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\backend"
try {
    .\mvnw.cmd clean package -DskipTests
    Write-Host "Backend built successfully!" -ForegroundColor Green
} finally {
    Pop-Location
}

# 2. Build Frontend Extension
Write-Host "`n[2/2] Building Angular Frontend Extension..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
try {
    npm run build
    Write-Host "Frontend extension built successfully at frontend/dist/voicelink-extension!" -ForegroundColor Green
} finally {
    Pop-Location
}

Write-Host "`n=== Build Complete! ===" -ForegroundColor Cyan
Write-Host "You can now load 'frontend/dist/voicelink-extension' into chrome://extensions" -ForegroundColor White
