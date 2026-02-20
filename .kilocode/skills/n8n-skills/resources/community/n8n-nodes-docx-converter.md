# DOCX Converter

### Basic Information

- **Package Name:** `n8n-nodes-docx-converter`
- **Category:** 📄 Document Processing & Parsing
- **Primary Use Case:** Convert DOCX documents to HTML or Markdown format
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-docx-converter](https://www.npmjs.com/package/n8n-nodes-docx-converter)
- **GitHub Repository:** [Check npm for latest link]

### Installation Command

```bash
npm install n8n-nodes-docx-converter
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| DOCX Converter | `n8n-nodes-docx-converter.docxConverter` | 1 | Document Parser |

### Node Description

A utility node that converts Microsoft Word (DOCX) files into web-friendly formats like HTML or Markdown. This is essential for processing document content in AI workflows, CMS publishing, or content migration pipelines.

### Available Operations

1. **Convert to HTML** (`toHtml`)
   - Convert DOCX content to semantic HTML
   - Parameters: Binary property name
   - Returns: HTML string

2. **Convert to Markdown** (`toMarkdown`)
   - Convert DOCX content to Markdown
   - Parameters: Binary property name
   - Returns: Markdown string

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `toHtml` | Conversion target format (`toHtml`, `toMarkdown`) |
| `binaryPropertyName` | string | Yes | `data` | Input binary property name containing the DOCX file |
| `destinationKey` | string | No | `content` | Output field name for converted content |
| `stripEmptyParagraphs` | boolean | No | `true` | Remove empty lines/paragraphs |
| `convertImages` | boolean | No | `false` | Convert embedded images to base64 |

### Credentials Required

**No credentials required**

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Binary data in specified property (default: `data`) |
| **Output Fields** | Converted content in `destinationKey` |

### Example Usage

```json
{
  "name": "DOCX to Markdown",
  "type": "n8n-nodes-docx-converter.docxConverter",
  "typeVersion": 1,
  "position": [450, 300],
  "parameters": {
    "operation": "toMarkdown",
    "binaryPropertyName": "data",
    "destinationKey": "markdown_content",
    "stripEmptyParagraphs": true
  }
}
```

### Common Use Cases

- Converting Word documents for LLM context injection
- Publishing DOCX content to headless CMS or blogs
- extracting clean text from formatted documents
- Document archival and standardization
- Automated report processing

### Important Notes

- Input must be a valid `.docx` file (binary data)
- Legacy `.doc` files may not be supported
- Image conversion increases payload size significantly
- Complex formatting (tables, headers) is preserved where possible
