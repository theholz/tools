# PDF Vector

### Basic Information

- **Package Name:** `n8n-nodes-pdfvector`
- **Category:** 📄 Document Processing & Parsing
- **Primary Use Case:** Extract text and metadata from PDFs for vector embeddings
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-pdfvector](https://www.npmjs.com/package/n8n-nodes-pdfvector)

### Installation Command

```bash
npm install n8n-nodes-pdfvector
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| PDF Vector | `n8n-nodes-pdfvector.pdfVector` | 1 | Document Parser |

### Node Description

A node designed to prepare PDF content for vector databases and RAG workflows. It extracts text, chunks content, and handles metadata extraction to streamline the process of turning PDF documents into embeddings.

### Available Operations

1. **Extract Text** (`extractText`)
   - Extract plain text from PDF
   - Parameters: Binary property
   - Returns: Text string

2. **Chunk Text** (`chunkText`)
   - Split PDF content into manageable chunks
   - Parameters: Binary property, chunk size, overlap
   - Returns: Array of text chunks

3. **Get Metadata** (`getMetadata`)
   - Extract PDF metadata (author, title, pages)
   - Parameters: Binary property
   - Returns: JSON metadata object

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `extractText` | Operation (`extractText`, `chunkText`, `getMetadata`) |
| `binaryPropertyName` | string | Yes | `data` | Input binary field name |
| `chunkSize` | number | No | `1000` | Characters per chunk (for chunkText) |
| `chunkOverlap` | number | No | `200` | Character overlap between chunks |
| `includePageNumbers` | boolean | No | `true` | Include page references in output |
| `cleanWhitespace` | boolean | No | `true` | Normalize whitespace and newlines |

### Credentials Required

**No credentials required**

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Binary data in specified property (default: `data`) |
| **Output Fields** | `text` (string) or `chunks` (array) or `metadata` (object) |

### Example Usage

```json
{
  "name": "Prepare PDF for RAG",
  "type": "n8n-nodes-pdfvector.pdfVector",
  "typeVersion": 1,
  "position": [600, 400],
  "parameters": {
    "operation": "chunkText",
    "binaryPropertyName": "data",
    "chunkSize": 1500,
    "chunkOverlap": 150,
    "cleanWhitespace": true
  }
}
```

### Common Use Cases

- Preparing legal documents for vector search
- Ingesting manuals and documentation into RAG pipelines
- Extracting specific pages or sections for analysis
- Automating metadata extraction for document archiving

### Important Notes

- Operates on binary data (requires prior HTTP Request or Read File node)
- optimized for text-based PDFs; scanned PDFs may require OCR (use Tesseract node)
- Chunking strategy is character-based by default
