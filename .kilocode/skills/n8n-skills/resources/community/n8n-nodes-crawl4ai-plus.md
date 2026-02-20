# Crawl4AI Plus

### Basic Information

- **Package Name:** `n8n-nodes-crawl4ai-plus`
- **Category:** 🕷️ Web Scraping & Data Extraction
- **Primary Use Case:** Advanced web scraping with intelligent extraction using AI-powered content understanding
- **Maintainer:** Crawl4AI Team
- **npm Repository:** [n8n-nodes-crawl4ai-plus](https://www.npmjs.com/package/n8n-nodes-crawl4ai-plus)
- **GitHub Repository:** [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai)

### Installation Command

```bash
npm install n8n-nodes-crawl4ai-plus
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Crawl4AI Plus | `n8n-nodes-crawl4ai-plus.crawl4aiPlus` | 1 | Scraper |

### Node Description

Crawl4AI Plus combines web scraping with AI extraction capabilities. It can crawl websites, extract structured data, generate summaries, and intelligently parse content without requiring specific selectors or manual structure definition.

### Available Operations

1. **Crawl URL** (`crawlUrl`)
   - Fetch and parse webpage
   - Parameters: URL, crawl options
   - Returns: Page content and metadata

2. **Extract Data** (`extractData`)
   - Use AI to extract structured data
   - Parameters: URL, extraction schema or description
   - Returns: Extracted structured data

3. **Get Markdown** (`getMarkdown`)
   - Convert webpage to clean markdown
   - Parameters: URL, markdown options
   - Returns: Markdown formatted content

4. **Batch Crawl** (`batchCrawl`)
   - Crawl multiple URLs efficiently
   - Parameters: URL array, crawl options
   - Returns: Array of crawl results

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `crawlUrl` | Operation to perform |
| `url` | string | Yes | `""` | Target webpage URL |
| `urls` | array | Yes* | `[]` | Array of URLs (*for batchCrawl) |
| `extractionSchema` | object | No | `{}` | JSON schema for extraction |
| `extractionDescription` | string (textarea) | No | `""` | Natural language description of data to extract |
| `includeMarkdown` | boolean | No | `true` | Include markdown version of content |
| `includeLinksDomains` | boolean | No | `false` | Extract links and domain information |
| `removeNoise` | boolean | No | `true` | Remove navigation, ads, etc. |
| `jsRendering` | boolean | No | `false` | Execute JavaScript before extraction |
| `jsWait` | number | No | `2000` | Wait time after JS execution (ms) |
| `timeout` | number | No | `30000` | Request timeout (ms) |
| `headers` | object | No | `{}` | Custom HTTP headers |
| `proxy` | string | No | `""` | Proxy URL if required |
| `userAgent` | string | No | `default` | Custom user agent string |

### Credentials Required

**No standard credentials required** - Optional proxy authentication

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `url`, optional `extractionSchema` or `extractionDescription` |
| **Output Fields** | `content`, `markdown`, `extractedData`, `metadata`, `links`, `error` |

### Example Usage

```json
{
  "name": "Crawl4AI Plus",
  "type": "n8n-nodes-crawl4ai-plus.crawl4aiPlus",
  "typeVersion": 1,
  "position": [650, 750],
  "parameters": {
    "operation": "extractData",
    "url": "https://example.com/products",
    "extractionDescription": "Extract all product names, prices, and descriptions",
    "removeNoise": true,
    "includeMarkdown": true
  }
}
```

### Common Use Cases

- E-commerce price monitoring
- Content aggregation and curation
- Lead generation from web pages
- Competitive intelligence gathering
- Document extraction and processing
- Real estate listing scraping

### Important Notes

- Respect robots.txt and terms of service
- JavaScript rendering increases processing time
- AI extraction works best with clear prompts
- Batch operations are more efficient than individual crawls
- Rate limiting may apply to high-volume crawls
