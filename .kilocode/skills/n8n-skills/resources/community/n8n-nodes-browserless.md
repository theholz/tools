# Browserless

### Basic Information

- **Package Name:** `n8n-nodes-browserless`
- **Category:** 🕷️ Browser Automation & Screenshot
- **Primary Use Case:** Capture screenshots, PDFs, and perform browser automation on cloud-hosted or self-hosted Browserless instances
- **Maintainer:** Browserless Team
- **npm Repository:** [n8n-nodes-browserless](https://www.npmjs.com/package/n8n-nodes-browserless)
- **GitHub Repository:** [browserless/browserless](https://github.com/browserless/browserless)

### Installation Command

```bash
npm install n8n-nodes-browserless
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Browserless | `n8n-nodes-browserless.browserless` | 1 | Browser/Automation |

### Node Description

Browserless provides headless browser capabilities in cloud. This node allows you to capture screenshots, generate PDFs, scrape dynamic content, and perform complex browser automation without managing browser infrastructure.

### Available Operations

1. **Screenshot** (`screenshot`)
   - Capture webpage as image
   - Parameters: URL, screenshot options, viewport
   - Returns: Screenshot image data

2. **PDF** (`pdf`)
   - Generate PDF from webpage
   - Parameters: URL, PDF options, formatting
   - Returns: PDF file data

3. **Scrape** (`scrape`)
   - Extract content from dynamic pages
   - Parameters: URL, selector, script
   - Returns: Scraped data

4. **Function** (`function`)
   - Execute custom puppeteer script
   - Parameters: Script code, context
   - Returns: Script execution result

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `screenshot` | Operation to perform |
| `token` | string (credential) | Yes | `""` | Browserless API token |
| `url` | string | Yes | `""` | Target webpage URL |
| `quality` | number | No | `80` | Image quality for screenshot (0-100) |
| `type` | options | No | `png` | Image type: `png`, `jpeg`, `webp` |
| `width` | number | No | `1280` | Viewport width (px) |
| `height` | number | No | `720` | Viewport height (px) |
| `fullPage` | boolean | No | `false` | Capture full page height |
| `margin` | object | No | `{}` | PDF margins (top, bottom, left, right) |
| `scale` | number | No | `1` | PDF scale factor |
| `displayHeaderFooter` | boolean | No | `false` | Show header/footer in PDF |
| `printBackground` | boolean | No | `true` | Include background in PDF |
| `selector` | string | No | `body` | CSS selector for scraping (*for scrape) |
| `script` | string (textarea) | No | `""` | Custom script code (*for function) |
| `waitFor` | string | No | `""` | CSS selector to wait for before capturing |
| `waitForTimeout` | number | No | `30000` | Maximum wait time (ms) |
| `cookies` | array | No | `[]` | Array of cookie objects |
| `headers` | object | No | `{}` | Custom HTTP headers |

### Credentials Required

**Browserless API Credential Type:** `Browserless API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Token` | Yes | Browserless authentication token |
| `Base URL` | No | Custom Browserless endpoint |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `url`, optional viewport and capture options |
| **Output Fields** | `data` (base64 image or PDF), `contentType`, `message` |

### Example Usage

```json
{
  "name": "Browserless Screenshot",
  "type": "n8n-nodes-browserless.browserless",
  "typeVersion": 1,
  "position": [700, 800],
  "parameters": {
    "operation": "screenshot",
    "url": "https://example.com",
    "type": "png",
    "width": 1920,
    "height": 1080,
    "fullPage": true,
    "quality": 90
  },
  "credentials": {
    "browserlessApi": "browserless_credential"
  }
}
```

### Common Use Cases

- Automated website monitoring and alerting
- Screenshot-based testing and visual regression
- PDF report generation
- Dynamic content extraction from SPAs
- Visual comparison and documentation
- Social media preview generation

### Important Notes

- Cloud instances have concurrent connection limits
- Long-running operations may timeout
- Authentication may be optional on local instances
- Full page screenshots include entire scrollable height
- PDF generation includes all page content by default
