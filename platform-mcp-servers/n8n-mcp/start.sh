#!/bin/sh
set -e

echo "Starting MCP Super (n8n tools: Makafeli/FlowEngine)..."
echo "N8N_API_URL: ${N8N_API_URL}"
echo "Gateway Port: 3000"

# supergateway CLI requires --stdio with a command, not --config
# Using Makafeli n8n-workflow-builder as the primary MCP
export N8N_API_KEY="${N8N_API_KEY}"
export N8N_API_URL="${N8N_API_URL}"

exec supergateway \
  --stdio "npx -y @makafeli/n8n-workflow-builder" \
  --port 3000 \
  --outputTransport sse \
  --cors \
  --healthEndpoint /health
