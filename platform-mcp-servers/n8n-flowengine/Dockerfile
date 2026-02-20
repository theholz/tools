# FlowEngine MCP Server - n8n node building tools (545 nodes)
# Provides node building capabilities complementary to Makafeli's workflow management
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget

WORKDIR /app

RUN npm install -g supergateway flowengine-n8n-workflow-builder

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 0

CMD ["/usr/local/bin/start.sh"]
