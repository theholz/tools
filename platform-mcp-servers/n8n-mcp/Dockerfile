# MCP Super Server - Dedicated to n8n MCP tools (Makafeli + FlowEngine) for multi-client access
# Replaces the former n8n-mcp-gateway; exposes same two MCPs on port 3000 via supergateway.
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    gettext

WORKDIR /app

RUN npm install -g supergateway
RUN npm install -g @makafeli/n8n-workflow-builder flowengine-n8n-workflow-builder

RUN mkdir -p /app/config /app/logs

COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["/usr/local/bin/start.sh"]
