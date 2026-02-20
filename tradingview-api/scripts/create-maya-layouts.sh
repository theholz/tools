#!/bin/bash
# Create MAYA Platform Layouts
# Duplicates your existing layouts and creates MAYA-* versions

API_URL="${TV_API_URL:-https://tv-api.holbrook.app}"

echo "🏗️  Creating MAYA Platform Layouts"
echo "=================================="
echo ""

# Check API health
echo "Checking API connection..."
HEALTH=$(curl -s "$API_URL/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" != "healthy" ]; then
  echo "❌ API not healthy. Please ensure TradingView API is running."
  exit 1
fi
echo "✅ API connected"
echo ""

# Function to duplicate layout
duplicate_layout() {
  local source=$1
  local target=$2
  
  echo "📋 Duplicating: $source → $target"
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/layouts/duplicate" \
    -H "Content-Type: application/json" \
    -d "{
      \"sourceLayoutName\": \"$source\",
      \"newLayoutName\": \"$target\"
    }")
  
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ Created: $target"
    return 0
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
    echo "❌ Failed: $ERROR"
    return 1
  fi
}

# Create layouts
echo "Creating category layouts..."
echo ""

# Stocks
duplicate_layout "Primary-Stocks" "MAYA-Backtest-Stocks-Bulk"
echo ""

# Crypto
duplicate_layout "Primary-Crypto" "MAYA-Backtest-Crypto-Bulk"
echo ""

# Pairs
duplicate_layout "Pairs" "MAYA-Backtest-Pairs-Bulk"
echo ""

# Rotation
duplicate_layout "Rotation" "MAYA-Backtest-Rotation-Bulk"
echo ""

echo "=================================="
echo "✅ Layout creation complete!"
echo ""
echo "Next steps:"
echo "1. Open each MAYA-* layout in TradingView"
echo "2. Enable backtest tables for all indicators"
echo "3. Create MAYA-* watchlists"
echo "4. Add symbols to watchlists"
echo ""
echo "See: docs/runbooks/LAYOUT_SETUP_GUIDE.md"
