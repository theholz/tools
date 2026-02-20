# Platform Infrastructure MCP

A unified MCP server consolidating infrastructure management tools into a single efficient process. Provides "hands" for the agent to manage the entire data estate.

## 🛠️ Included Tools

### Docker Management
*   **`list_docker_containers`** - List containers with filters
*   **`get_docker_container_logs`** - Get container logs
*   **`restart_docker_container`** - Restart containers

### Redis Operations
*   **`get_redis_key`** - Get value from Redis
*   **`set_redis_key`** - Set value in Redis with optional TTL
*   **`list_redis_keys`** - List keys matching a pattern
*   **`get_redis_queue_info`** - Get BullMQ queue statistics

### Neo4j Graph Database
*   **`execute_cypher_query`** - Execute Cypher queries
*   **`get_neo4j_schema`** - Get database schema (labels, relationships, properties)

### Qdrant Vector Database
*   **`list_qdrant_collections`** - List all collections
*   **`search_qdrant_collection`** - Vector similarity search

### MinIO/S3 Object Storage
*   **`list_s3_buckets`** - List S3-compatible buckets
*   **`list_s3_objects`** - List objects in a bucket

### Filesystem Operations
*   **`read_file_content`** - Read file contents
*   **`write_file_content`** - Write file contents
*   **`list_directory`** - List files and directories

### Git Version Control
*   **`get_git_status`** - Get repository status
*   **`get_git_log`** - Get commit history

### Crawl4AI (Web Scraping Service)
*   **`crawl4ai_scrape_url`** - Scrape a single URL using Crawl4AI service
*   **`crawl4ai_crawl_multiple_urls`** - Crawl multiple URLs concurrently

### Requesty (LLM Router Service)
*   **`requesty_chat_completion`** - Get chat completion from Requesty LLM router
*   **`requesty_list_models`** - List available models from Requesty
*   **`requesty_get_usage`** - Get usage statistics from Requesty

## 🔑 Configuration

### Environment Variables

Most tools use default Docker service names. Override if needed:

```bash
# Redis
REDIS_URL=redis://redis:6379

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_AUTH_USERNAME=neo4j
NEO4J_AUTH_PASSWORD=your_password

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your_key_here  # Optional

# MinIO/S3
MINIO_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=your_user
MINIO_ROOT_PASSWORD=your_password

# Crawl4AI (Web Scraping Service)
CRAWL4AI_URL=http://crawl4ai:11235
CRAWL4AI_API_TOKEN=your_token_here  # Optional

# Requesty (LLM Router)
REQUESTY_API_URL=https://api.requesty.ai
REQUESTY_API_KEY=your_api_key_here  # Required
```

### Docker Socket Access

For Docker operations, the container needs access to the Docker socket:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

## 🏗️ Architecture

This server uses `fastmcp` and consolidates:
- **Docker SDK:** Container management
- **Redis-py:** Cache and queue operations
- **Neo4j Driver:** Graph database queries
- **Qdrant Client:** Vector database operations
- **Boto3:** S3-compatible object storage
- **Python stdlib:** Filesystem and Git operations

## 📚 Related Documentation

- [Unified MCP Strategy](../../docs/architecture/unified-mcp-strategy.md)
- [MCP Gap Analysis](../../docs/architecture/mcp-gap-analysis.md)
- [Tool Registry](../../docs/agent-context/tool-registry.md)

