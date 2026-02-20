# SearXNG

### Basic Information

- **Package Name:** `n8n-nodes-searxng`
- **Category:** 🔍 Search & Web Scraping
- **Primary Use Case:** Interact with self-hosted or public SearXNG meta-search instances for privacy-focused web search
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-searxng](https://www.npmjs.com/package/n8n-nodes-searxng)
- **GitHub Repository:** [searxng/searxng](https://github.com/searxng/searxng)

### Installation Command

```bash
npm install n8n-nodes-searxng
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| SearXNG | `n8n-nodes-searxng.searxng` | 1 | Search |

### Node Description

SearXNG is a privacy-respecting meta-search engine that aggregates results from multiple search engines without tracking users. This node allows queries to your own SearXNG instance for decentralized, privacy-conscious web searches.

### Available Operations

1. **Search** (`search`)
   - Perform meta-search across multiple engines
   - Parameters: Query, search options, filters
   - Returns: Aggregated search results

2. **Search Images** (`searchImages`)
   - Image search across engines
   - Parameters: Query, image options
   - Returns: Image results with sources

3. **Search Videos** (`searchVideos`)
   - Video search functionality
   - Parameters: Query, video filters
   - Returns: Video results and metadata

4. **Get Preferences** (`getPreferences`)
   - Retrieve SearXNG instance settings
   - Parameters: None
   - Returns: Instance configuration

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `search` | Operation to perform |
| `instanceUrl` | string | Yes | `http://localhost:8888` | SearXNG instance URL |
| `query` | string (textarea) | Yes | `""` | Search query |
| `searchType` | options | No | `general` | Search type: `general`, `images`, `videos`, `news` |
| `language` | string | No | `en` | Result language code |
| `engines` | string | No | `""` | Comma-separated engine names (leave empty for default) |
| `maxResults` | number | No | `10` | Number of results to return |
| `pageNumber` | number | No | `0` | Page number for pagination |
| `timeRange` | options | No | `all` | Time filter: `day`, `week`, `month`, `year`, `all` |
| `safeSearch` | number | No | `0` | Safe search level: 0=off, 1=moderate, 2=strict |
| `categoryFilter` | array | No | `[]` | Result categories to include/exclude |

### Credentials Required

**No credentials required** - SearXNG is typically open or requires instance URL only

| Field | Required | Description |
|-------|----------|-------------|
| `Instance URL` | Yes | URL to SearXNG instance |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `query`, optional `searchType`, `language` |
| **Output Fields** | `results` (array), `numberOfResults`, `executionTime` |

### Example Usage

```json
{
  "name": "SearXNG Search",
  "type": "n8n-nodes-searxng.searxng",
  "typeVersion": 1,
  "position": [600, 700],
  "parameters": {
    "operation": "search",
    "instanceUrl": "http://localhost:8888",
    "query": "machine learning algorithms",
    "searchType": "general",
    "maxResults": 20,
    "language": "en"
  }
}
```

### Common Use Cases

- Privacy-respecting web search integration
- Decentralized search for sensitive topics
- Meta-search result aggregation
- Self-hosted search solutions
- Research with multiple search engine inputs

### Important Notes

- Requires access to SearXNG instance (self-hosted or public)
- Results vary based on configured search engines
- No tracking or logging of searches
- Performance depends on instance configuration
- Public instances may have rate limiting
