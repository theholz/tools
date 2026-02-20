#!/bin/bash
# Install TradingView API as systemd service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_FILE="$PROJECT_ROOT/tradingview-api.service"
SYSTEMD_DIR="/etc/systemd/system"

echo "🔧 Installing TradingView API Service"
echo "======================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run with sudo"
  echo "   Usage: sudo $0"
  exit 1
fi

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
  echo "❌ Service file not found: $SERVICE_FILE"
  exit 1
fi

# Check if API is built
if [ ! -f "$PROJECT_ROOT/dist/index.js" ]; then
  echo "⚠️  API not built. Building now..."
  cd "$PROJECT_ROOT"
  sudo -u tait npm run build
  if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
  fi
fi

# Copy service file
echo "📋 Copying service file..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/tradingview-api.service"

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable service (start on boot)
echo "✅ Enabling service (auto-start on boot)..."
systemctl enable tradingview-api.service

# Start service
echo "🚀 Starting service..."
systemctl start tradingview-api.service

# Wait a moment
sleep 2

# Check status
echo ""
echo "📊 Service Status:"
systemctl status tradingview-api.service --no-pager -l

echo ""
echo "======================================"
echo "✅ TradingView API Service Installed!"
echo ""
echo "Commands:"
echo "  sudo systemctl start tradingview-api    - Start service"
echo "  sudo systemctl stop tradingview-api     - Stop service"
echo "  sudo systemctl restart tradingview-api  - Restart service"
echo "  sudo systemctl status tradingview-api   - Check status"
echo "  sudo journalctl -u tradingview-api -f   - View logs"
echo ""
echo "Service will auto-start on boot."
