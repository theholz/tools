#!/bin/sh
set -e

echo "Starting FlowEngine MCP Server (n8n node building tools)..."
echo "N8N_API_URL: ${N8N_API_URL}"
echo "Gateway Port: 3000"

export N8N_API_KEY="${N8N_API_KEY}"
export N8N_API_URL="${N8N_API_URL}"

exec supergateway \
  --stdio "npx -y flowengine-n8n-workflow-builder" \
  --port 3000 \
  --outputTransport sse \
  --cors \
  --healthEndpoint /health
