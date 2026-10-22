# VoiceLink Backend Run Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== Starting VoiceLink Spring Boot Backend ===" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\backend"
try {
    .\mvnw.cmd spring-boot:run
} finally {
    Pop-Location
}
