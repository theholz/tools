#!/bin/bash
# Start TradingView API (quick start script)
# Use this for manual starts, or install systemd service for auto-start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Starting TradingView API"
echo "==========================="
echo ""

# Check if already running
if curl -s http://localhost:8084/health > /dev/null 2>&1; then
  echo "✅ API is already running"
  STATUS=$(curl -s http://localhost:8084/health | jq -r '.status' 2>/dev/null || echo "unknown")
  echo "   Status: $STATUS"
  echo ""
  echo "To restart:"
  echo "  pkill -f 'node.*dist/index.js'"
  echo "  Then run this script again"
  exit 0
fi

# Check if built
if [ ! -f "dist/index.js" ]; then
  echo "⚠️  API not built. Building now..."
  npm run build
  echo ""
fi

# Check if Playwright browsers installed
if [ ! -d "$HOME/.cache/ms-playwright/chromium-1200" ]; then
  echo "⚠️  Playwright browsers not installed. Installing Chromium..."
  npx playwright install chromium
  echo ""
fi

# Start API
echo "📦 Starting API server..."
nohup npm start > /tmp/tradingview-api-startup.log 2>&1 &
API_PID=$!

echo "⏳ Waiting for API to start..."
sleep 3

# Check if started
if ! ps -p $API_PID > /dev/null 2>&1; then
  echo "❌ API failed to start. Check logs:"
  echo "   tail -f /tmp/tradingview-api-startup.log"
  exit 1
fi

# Wait for health check
for i in {1..10}; do
  if curl -s http://localhost:8084/health > /dev/null 2>&1; then
    echo "✅ API started successfully (PID: $API_PID)"
    break
  fi
  sleep 1
done

# Connect browser
echo ""
echo "🔌 Connecting to browser..."
CONNECT_RESPONSE=$(curl -s -X POST http://localhost:8084/api/connect)
CONNECTED=$(echo "$CONNECT_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")

if [ "$CONNECTED" = "true" ]; then
  echo "✅ Browser connected"
else
  echo "⚠️  Browser connection may have failed"
  echo "   Response: $CONNECT_RESPONSE"
fi

# Final health check
echo ""
echo "📊 Final Status:"
curl -s http://localhost:8084/health | jq '.' 2>/dev/null || curl -s http://localhost:8084/health

echo ""
echo "==========================="
echo "✅ TradingView API Running!"
echo ""
echo "Health: http://localhost:8084/health"
echo "Status: http://localhost:8084/api/status"
echo ""
echo "To stop: pkill -f 'node.*dist/index.js'"
echo "Or install systemd service for auto-start: sudo ./scripts/install-service.sh"
