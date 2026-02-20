# Docling Serve

### Basic Information

- **Package Name:** `n8n-nodes-docling-serve`
- **Category:** 📄 Document Processing & Parsing
- **Primary Use Case:** Extract structured content from complex documents (PDF, Office) using AI-powered layout analysis
- **Maintainer:** Docling Team
- **npm Repository:** [n8n-nodes-docling-serve](https://www.npmjs.com/package/n8n-nodes-docling-serve)
- **GitHub Repository:** [DS4SD/docling](https://github.com/DS4SD/docling)

### Installation Command

```bash
npm install n8n-nodes-docling-serve
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Docling Serve | `n8n-nodes-docling-serve.doclingServe` | 1 | Document Parser |

### Node Description

Docling uses AI to understand document layout and extract structured information. This node processes complex PDFs and Office documents, extracting text, tables, headers, and maintaining document structure for downstream processing.

### Available Operations

1. **Parse Document** (`parseDocument`)
   - Process document and extract structure
   - Parameters: Document file, parsing options
   - Returns: Parsed document with sections, tables, metadata

2. **Extract Tables** (`extractTables`)
   - Extract tables as structured data
   - Parameters: Document, table options
   - Returns: Table data in JSON/CSV format

3. **Extract Text** (`extractText`)
   - Get clean text from document
   - Parameters: Document, text options
   - Returns: Extracted text content

4. **Get Metadata** (`getMetadata`)
   - Retrieve document metadata
   - Parameters: Document
   - Returns: Author, title, creation date, etc.

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `parseDocument` | Operation to perform |
| `serverUrl` | string | Yes | `http://localhost:5000` | Docling service URL |
| `document` | string (file) | Yes | `""` | Document file (PDF, DOCX, PPTX, etc) |
| `extractLayout` | boolean | No | `true` | Preserve document layout structure |
| `extractTables` | boolean | No | `true` | Extract table content |
| `extractImages` | boolean | No | `false` | Extract images from document |
| `outputFormat` | options | No | `json` | Output format: `json`, `markdown`, `text` |
| `tableFormat` | options | No | `json` | Table output: `json`, `csv`, `html` |
| `language` | string | No | `en` | Document language code |
| `ocrEnabled` | boolean | No | `false` | Enable OCR for scanned documents |

### Credentials Required

**No credentials required** - Optional server authentication

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `document` (file), optional `language`, `ocrEnabled` |
| **Output Fields** | `content`, `tables`, `metadata`, `sections`, `images`, `error` |

### Example Usage

```json
{
  "name": "Docling Parser",
  "type": "n8n-nodes-docling-serve.doclingServe",
  "typeVersion": 1,
  "position": [950, 1050],
  "parameters": {
    "operation": "parseDocument",
    "document": "{{$node['File Input'].json.document}}",
    "serverUrl": "http://localhost:5000",
    "extractLayout": true,
    "extractTables": true,
    "outputFormat": "markdown"
  }
}
```

### Common Use Cases

- PDF form processing and extraction
- Contract analysis and data extraction
- Report parsing and summarization
- Financial statement processing
- Research paper analysis
- Document digitization and archival

### Important Notes

- Docling service must be running (container deployment available)
- OCR improves scanned document accuracy
- Layout extraction maintains document structure
- Table detection works on complex tables
- Performance depends on document complexity
