# Tesseract.js OCR

### Basic Information

- **Package Name:** `n8n-nodes-tesseractjs`
- **Category:** 👁️ Computer Vision & OCR
- **Primary Use Case:** Extract text from images using optical character recognition (OCR)
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-tesseractjs](https://www.npmjs.com/package/n8n-nodes-tesseractjs)

### Installation Command

```bash
npm install n8n-nodes-tesseractjs
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Tesseract.js | `n8n-nodes-tesseractjs.tesseractjs` | 1 | Image Processor |

### Node Description

A node that leverages the pure JavaScript Tesseract.js library to perform OCR on images directly within n8n workflows. It supports over 100 languages and can process various image formats to return raw extracted text.

### Available Operations

1. **Extract Text** (`recognize`)
   - Perform OCR on an input image
   - Parameters: Binary property, language
   - Returns: Extracted text and confidence score

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `binaryPropertyName` | string | Yes | `data` | Input binary field containing the image |
| `language` | string | No | `eng` | Language code (e.g., `eng`, `spa`, `deu`, `fra`) |
| `psm` | options | No | `3` | Page Segmentation Mode (auto, single block, single line, etc.) |
| `oem` | options | No | `3` | OCR Engine Mode (default/LSTM) |

### Credentials Required

**No credentials required**

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Binary image data (JPG, PNG, BMP, PBM) |
| **Output Fields** | `text` (string), `confidence` (number), `words` (array) |

### Example Usage

```json
{
  "name": "OCR Receipt",
  "type": "n8n-nodes-tesseractjs.tesseractjs",
  "typeVersion": 1,
  "position": [750, 450],
  "parameters": {
    "binaryPropertyName": "data",
    "language": "eng",
    "psm": 3
  }
}
```

### Common Use Cases

- Digitizing scanned receipts and invoices
- Reading text from screenshots or user uploads
- Automating data entry from physical forms
- Extracting text from memes or social media images
- Creating searchable archives from image-based documents

### Important Notes

- Performance depends on image quality and resolution
- Processing large images may be CPU intensive
- Supports multiple languages (downloaded on first use if not present)
- Pre-processing images (increasing contrast, resizing) often improves results
