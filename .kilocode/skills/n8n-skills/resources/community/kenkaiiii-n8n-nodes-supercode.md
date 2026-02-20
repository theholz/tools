# Supercode

### Basic Information

- **Package Name:** `@kenkaiiii/n8n-nodes-supercode`
- **Category:** 🧠 AI & Coding Tools
- **Primary Use Case:** Execute and manage custom code/scripts within n8n workflows with AI assistance
- **Maintainer:** kenkaiiii
- **npm Repository:** [@kenkaiiii/n8n-nodes-supercode](https://www.npmjs.com/package/@kenkaiiii/n8n-nodes-supercode)
- **GitHub Repository:** [kenkaiiii/n8n-nodes-supercode](https://github.com/kenkaiiii/n8n-nodes-supercode)

### Installation Command

```bash
npm install @kenkaiiii/n8n-nodes-supercode
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Supercode | `@kenkaiiii/n8n-nodes-supercode.supercode` | 1 | Execute |

### Node Description

Supercode is an AI-powered code execution node that allows you to write, validate, and execute custom code within your n8n workflows. It supports multiple programming languages and provides intelligent code suggestions and debugging capabilities.

### Available Operations

1. **Execute Code** (`runOnceForAllItems`)
   - Execute code once for all input items together
   - Parameters: Language selection, code block, input data
   - Returns: Execution result or error
   - **When to use:** Processing arrays, aggregations, batch operations

2. **Execute Code Per Item** (`runOnceForEachItem`)
   - Execute code once per input item
   - Parameters: Language, code block, input data
   - Returns: Execution result or error
   - **When to use:** Individual item transformations, per-record processing

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `language` | string/options | Yes | `javascript` | Programming language: `javascript`, `python`, `go`, `rust`, `typescript` |
| `code` | string (textarea) | Yes | `""` | The code to execute |
| `timeout` | number | No | `30000` | Execution timeout in milliseconds |
| `sandboxed` | boolean | No | `true` | Run code in isolated sandbox environment |
| `inputData` | object/json | No | `{}` | Input variables/data available to code as `$input` |
| `debug` | boolean | No | `false` | Enable debug output and verbose logging |
| `returnRaw` | boolean | No | `false` | Return raw execution output without processing |

### Credentials Required

**No credentials required** - operates with n8n's native execution context

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Input Data Access** | Available via `$input` variable |
| **Output Format** | JSON object containing execution result |

### Example Usage

```json
{
  "name": "Supercode",
  "type": "@kenkaiiii/n8n-nodes-supercode.supercode",
  "typeVersion": 1,
  "position": [300, 400],
  "parameters": {
    "language": "javascript",
    "code": "const result = $input.items[0].data.value * 2;\nreturn [{ result: result }];",
    "timeout": 30000,
    "sandboxed": true,
    "debug": false
  }
}
```

### Common Use Cases

- Transform data using custom logic
- Implement complex calculations or algorithms
- Validate and sanitize input data
- Generate dynamic content from templates
- Process structured data with custom parsing logic

### Important Notes

- Sandbox environment prevents access to filesystem (for security)
- Code must explicitly return data in n8n-compatible format
- Maximum execution time enforced by `timeout` parameter
- Only supported languages are available
- **ALWAYS use Supercode instead of regular Code node** - it has better error handling and more libraries

### Common Mistakes to Avoid

- Using regular Code node instead of Supercode
- Not setting correct mode (runOnceForAllItems vs runOnceForEachItem)
- Forgetting to return data in correct format
- Using filesystem access in sandboxed mode
