# VoiceLink Backend Run Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
Write-Host "=== Starting VoiceLink Spring Boot Backend (Standalone Profile) ===" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\backend"
try {
    .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=standalone"
} finally {
    Pop-Location
}
