#!/usr/bin/env bash
set -e

echo "=== Building VoiceLink Monorepo ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Build Backend
echo -e "\n[1/2] Building Spring Boot Backend..."
cd "$SCRIPT_DIR/../backend"
./mvnw clean package -DskipTests
echo "Backend built successfully!"

# 2. Build Frontend Extension
echo -e "\n[2/2] Building Angular Frontend Extension..."
cd "$SCRIPT_DIR/../frontend"
npm run build
echo "Frontend extension built successfully at frontend/dist/voicelink-extension!"

echo -e "\n=== Build Complete! ==="
echo "You can now load 'frontend/dist/voicelink-extension' into chrome://extensions"
