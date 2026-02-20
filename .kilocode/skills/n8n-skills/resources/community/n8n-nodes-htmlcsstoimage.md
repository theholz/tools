# HTML/CSS to Image

### Basic Information

- **Package Name:** `n8n-nodes-htmlcsstoimage`
- **Category:** 🖼️ Image Generation & Manipulation
- **Primary Use Case:** Generate high-quality images from HTML and CSS code
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-htmlcsstoimage](https://www.npmjs.com/package/n8n-nodes-htmlcsstoimage)

### Installation Command

```bash
npm install n8n-nodes-htmlcsstoimage
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| HTML/CSS to Image | `n8n-nodes-htmlcsstoimage.htmlCssToImage` | 1 | Image Generator |

### Node Description

A node that interacts with the HCTI (HTML/CSS to Image) API to convert HTML markup and CSS styles into image files (JPG/PNG). Perfect for generating dynamic social media assets, certificates, or reports.

### Available Operations

1. **Create Image** (`createImage`)
   - Generate an image from HTML/CSS
   - Parameters: HTML code, CSS code, dimensions
   - Returns: Image URL and metadata

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `html` | string (html) | Yes | `<div>Hello World</div>` | The HTML content to render |
| `css` | string (css) | No | `div { color: red; }` | CSS styles to apply |
| `google_fonts` | string | No | - | Google Fonts to load (e.g., `Roboto`) |
| `ms_delay` | number | No | `500` | Delay before capturing (ms) |
| `selector` | string | No | - | CSS selector to capture specific element |
| `format` | options | No | `png` | Output format (`png`, `jpg`, `webp`) |

### Credentials Required

**Credential Type:** `htmlCssToImageApi`

| Field | Required | Description |
|-------|----------|-------------|
| `User ID` | Yes | Your HCTI User ID |
| `API Key` | Yes | Your HCTI API Key |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | None (parameters defined in node) |
| **Output Fields** | `url` (string), `width`, `height`, `size` |

### Example Usage

```json
{
  "name": "Generate Social Card",
  "type": "n8n-nodes-htmlcsstoimage.htmlCssToImage",
  "typeVersion": 1,
  "position": [400, 600],
  "parameters": {
    "html": "<div class='card'><h1>{{$node['Webhook'].json.title}}</h1></div>",
    "css": ".card { background: #333; color: white; padding: 20px; }",
    "google_fonts": "Inter",
    "format": "png"
  },
  "credentials": {
    "htmlCssToImageApi": "hcti_creds"
  }
}
```

### Common Use Cases

- Dynamic social media preview images (OG tags)
- Generating personalized certificates or tickets
- Creating automated report screenshots
- Visualizing data tables as images for email
- converting email templates to preview images

### Important Notes

- Requires an API key from [htmlcsstoimage.com](https://htmlcsstoimage.com)
- Free tier has rate limits and watermarks
- Supports modern CSS features (Flexbox, Grid)
- External images in HTML must be publicly accessible URLs
