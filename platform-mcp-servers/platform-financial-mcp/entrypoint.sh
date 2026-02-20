#!/bin/bash
set -e

# Run supergateway with CORS enabled
# Auth token is optional - add --authToken "$MCP_AUTH_TOKEN" if needed
exec supergateway \
    --stdio "python -m src.server" \
    --port 8000 \
    --baseUrl http://0.0.0.0:8000 \
    --cors
