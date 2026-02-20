"""
Platform Infrastructure MCP - Database & DevOps Tools
12 tools: Neo4j (2), PostgreSQL (1), Qdrant (2), Redis (4), GitHub (3)
"""
import os
import logging
from typing import Any, Dict, List, Optional
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("platform-infrastructure-mcp")

mcp = FastMCP("platform-infrastructure-mcp")

# ============================================================================
# NEO4J TOOLS
# ============================================================================

@mcp.tool()
async def execute_cypher_query(query: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute a Cypher query against Neo4j."""
    try:
        from neo4j import GraphDatabase
        
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        neo4j_user = os.getenv("NEO4J_AUTH_USERNAME", "neo4j")
        neo4j_password = os.getenv("NEO4J_AUTH_PASSWORD")
        
        if not neo4j_password:
            return {"error": "NEO4J_AUTH_PASSWORD not set", "success": False}
        
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        
        with driver.session() as session:
            result = session.run(query, parameters or {})
            records = [dict(record) for record in result]
        
        driver.close()
        return {"query": query, "parameters": parameters, "results": records, "count": len(records), "success": True}
    except Exception as e:
        logger.error(f"Neo4j query error: {e}")
        return {"error": str(e), "query": query, "success": False}

@mcp.tool()
async def get_neo4j_schema() -> Dict[str, Any]:
    """Get Neo4j database schema (node labels and relationship types)."""
    try:
        from neo4j import GraphDatabase
        
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        neo4j_user = os.getenv("NEO4J_AUTH_USERNAME", "neo4j")
        neo4j_password = os.getenv("NEO4J_AUTH_PASSWORD")
        
        if not neo4j_password:
            return {"error": "NEO4J_AUTH_PASSWORD not set", "success": False}
        
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        
        with driver.session() as session:
            labels = [record["label"] for record in session.run("CALL db.labels()")]
            rels = [record["relationshipType"] for record in session.run("CALL db.relationshipTypes()")]
            props = [record["propertyKey"] for record in session.run("CALL db.propertyKeys()")]
        
        driver.close()
        return {"labels": labels, "relationship_types": rels, "property_keys": props, "success": True}
    except Exception as e:
        logger.error(f"Neo4j schema error: {e}")
        return {"error": str(e), "success": False}

# ============================================================================
# POSTGRESQL TOOLS (also for pgvector)
# ============================================================================

@mcp.tool()
async def execute_postgres_query(query: str, database: Optional[str] = None) -> Dict[str, Any]:
    """Execute a SQL query against PostgreSQL (also supports pgvector operations)."""
    try:
        import asyncpg
        
        postgres_host = os.getenv("POSTGRES_HOST", "postgres")
        postgres_port = int(os.getenv("POSTGRES_PORT", "5432"))
        postgres_user = os.getenv("POSTGRES_USER", "postgres")
        postgres_password = os.getenv("POSTGRES_PASSWORD")
        postgres_db = database or os.getenv("POSTGRES_DB", "postgres")
        
        if not postgres_password:
            return {"error": "POSTGRES_PASSWORD not set", "success": False}
        
        conn = await asyncpg.connect(host=postgres_host, port=postgres_port, user=postgres_user, password=postgres_password, database=postgres_db)
        
        try:
            rows = await conn.fetch(query)
            results = [dict(row) for row in rows]
        finally:
            await conn.close()
        
        return {"query": query, "database": postgres_db, "results": results, "count": len(results), "success": True}
    except Exception as e:
        logger.error(f"PostgreSQL query error: {e}")
        return {"error": str(e), "query": query, "success": False}

# ============================================================================
# QDRANT TOOLS (Codebase Indexing)
# ============================================================================

@mcp.tool()
async def list_qdrant_collections() -> Dict[str, Any]:
    """List all Qdrant collections (used for codebase indexing)."""
    try:
        from qdrant_client import QdrantClient
        
        qdrant_url = os.getenv("QDRANT_URL", "http://qdrant:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key if qdrant_api_key else None)
        collections = client.get_collections()
        
        collection_list = []
        for collection in collections.collections:
            info = client.get_collection(collection.name)
            collection_list.append({"name": collection.name, "points_count": info.points_count, "vectors_count": info.vectors_count})
        
        return {"collections": collection_list, "count": len(collection_list), "success": True}
    except Exception as e:
        logger.error(f"Qdrant list collections error: {e}")
        return {"error": str(e), "success": False}

@mcp.tool()
async def search_qdrant_collection(collection_name: str, query_vector: List[float], limit: int = 10, score_threshold: Optional[float] = None) -> Dict[str, Any]:
    """Search a Qdrant collection with a query vector."""
    try:
        from qdrant_client import QdrantClient
        
        qdrant_url = os.getenv("QDRANT_URL", "http://qdrant:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key if qdrant_api_key else None)
        search_result = client.search(collection_name=collection_name, query_vector=query_vector, limit=limit, score_threshold=score_threshold)
        
        results = [{"id": point.id, "score": point.score, "payload": point.payload} for point in search_result]
        return {"collection": collection_name, "results": results, "count": len(results), "success": True}
    except Exception as e:
        logger.error(f"Qdrant search error: {e}")
        return {"error": str(e), "collection": collection_name, "success": False}

# ============================================================================
# REDIS TOOLS
# ============================================================================

@mcp.tool()
async def get_redis_key(key: str) -> Dict[str, Any]:
    """Get value from Redis by key."""
    try:
        import redis
        
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        
        value = redis_client.get(key)
        ttl = redis_client.ttl(key)
        
        return {"key": key, "value": value, "ttl": ttl if ttl > 0 else None, "exists": value is not None, "success": True}
    except Exception as e:
        logger.error(f"Redis get error: {e}")
        return {"error": str(e), "key": key, "success": False}

@mcp.tool()
async def set_redis_key(key: str, value: str, ttl: Optional[int] = None) -> Dict[str, Any]:
    """Set value in Redis with optional TTL."""
    try:
        import redis
        
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        
        if ttl:
            redis_client.setex(key, ttl, value)
        else:
            redis_client.set(key, value)
        
        return {"key": key, "value": value[:100] + "..." if len(value) > 100 else value, "ttl": ttl, "success": True}
    except Exception as e:
        logger.error(f"Redis set error: {e}")
        return {"error": str(e), "key": key, "success": False}

@mcp.tool()
async def list_redis_keys(pattern: str = "*", limit: int = 100) -> Dict[str, Any]:
    """List Redis keys matching a pattern."""
    try:
        import redis
        
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        
        keys = list(redis_client.scan_iter(match=pattern, count=limit))[:limit]
        return {"pattern": pattern, "keys": keys, "count": len(keys), "success": True}
    except Exception as e:
        logger.error(f"Redis list keys error: {e}")
        return {"error": str(e), "pattern": pattern, "success": False}

@mcp.tool()
async def get_redis_queue_info(queue_name: str) -> Dict[str, Any]:
    """Get information about a BullMQ queue in Redis."""
    try:
        import redis
        
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        
        waiting = redis_client.llen(f"bull:{queue_name}:waiting")
        active = redis_client.llen(f"bull:{queue_name}:active")
        completed = redis_client.zcard(f"bull:{queue_name}:completed")
        failed = redis_client.zcard(f"bull:{queue_name}:failed")
        
        return {"queue_name": queue_name, "waiting": waiting, "active": active, "completed": completed, "failed": failed, "total": waiting + active + completed + failed, "success": True}
    except Exception as e:
        logger.error(f"Redis queue info error: {e}")
        return {"error": str(e), "queue_name": queue_name, "success": False}

# ============================================================================
# GITHUB TOOLS
# ============================================================================

@mcp.tool()
async def github_get_repository(owner: str, repo: str) -> Dict[str, Any]:
    """Get GitHub repository information."""
    try:
        from github import Github
        
        github_token = os.getenv("GITHUB_TOKEN", "")
        if not github_token:
            return {"error": "GITHUB_TOKEN not set", "success": False}
        
        g = Github(github_token)
        repository = g.get_repo(f"{owner}/{repo}")
        
        return {
            "owner": owner, "repo": repo, "full_name": repository.full_name,
            "description": repository.description, "stars": repository.stargazers_count,
            "forks": repository.forks_count, "open_issues": repository.open_issues_count,
            "language": repository.language, "default_branch": repository.default_branch,
            "url": repository.html_url, "success": True
        }
    except Exception as e:
        logger.error(f"GitHub get repository error: {e}")
        return {"error": str(e), "owner": owner, "repo": repo, "success": False}

@mcp.tool()
async def github_list_issues(owner: str, repo: str, state: str = "open", limit: int = 10) -> Dict[str, Any]:
    """List GitHub repository issues."""
    try:
        from github import Github
        
        github_token = os.getenv("GITHUB_TOKEN", "")
        if not github_token:
            return {"error": "GITHUB_TOKEN not set", "success": False}
        
        g = Github(github_token)
        repository = g.get_repo(f"{owner}/{repo}")
        
        issues = []
        for issue in repository.get_issues(state=state)[:limit]:
            issues.append({
                "number": issue.number, "title": issue.title, "state": issue.state,
                "author": issue.user.login if issue.user else None,
                "created_at": issue.created_at.isoformat() if issue.created_at else None,
                "url": issue.html_url, "labels": [label.name for label in issue.labels]
            })
        
        return {"owner": owner, "repo": repo, "state": state, "issues": issues, "count": len(issues), "success": True}
    except Exception as e:
        logger.error(f"GitHub list issues error: {e}")
        return {"error": str(e), "owner": owner, "repo": repo, "success": False}

@mcp.tool()
async def github_search_code(query: str, language: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
    """Search GitHub code."""
    try:
        from github import Github
        
        github_token = os.getenv("GITHUB_TOKEN", "")
        if not github_token:
            return {"error": "GITHUB_TOKEN not set", "success": False}
        
        g = Github(github_token)
        
        search_query = query
        if language:
            search_query += f" language:{language}"
        
        results = g.search_code(search_query)
        
        code_results = []
        for i, result in enumerate(results):
            if i >= limit:
                break
            code_results.append({"name": result.name, "path": result.path, "repository": result.repository.full_name, "url": result.html_url, "language": result.repository.language})
        
        return {"query": query, "language": language, "results": code_results, "count": len(code_results), "success": True}
    except Exception as e:
        logger.error(f"GitHub search code error: {e}")
        return {"error": str(e), "query": query, "success": False}

if __name__ == "__main__":
    mcp.run()
