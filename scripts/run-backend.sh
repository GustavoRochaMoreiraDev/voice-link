#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== Starting VoiceLink Spring Boot Backend ==="
cd "$SCRIPT_DIR/../backend"
./mvnw spring-boot:run
