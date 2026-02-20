---
name: n8n-skills
description: "n8n workflow automation knowledge base. Provides n8n node information, node functionality details, workflow patterns, and configuration examples. Covers triggers, data transformation, data input/output, AI integration, covering 10 nodes. Keywords: n8n, workflow, automation, node, trigger, webhook, http request, database, ai agent."
license: MIT
metadata:
  author: Frank Chen
  version: "2.2.0"
---

# n8n Workflow Automation Skill Pack

## Overview

This skill helps with:
- Understanding n8n node functionality and usage
- Finding nodes suitable for specific tasks
- Learning common workflow patterns
- Getting node configuration examples
- Solving workflow design problems

This skill includes:
- Detailed information on the 10 most commonly used built-in n8n nodes
- 30+ popular community packages for extended functionality
- Node configuration examples and best practices
- Common workflow patterns
- Node categorization and indexing for both built-in and community nodes

## Table of Contents

- [Overview](#overview)
- [Common Workflow Patterns](#common-workflow-patterns)
- [How to Find Nodes](resources/guides/how-to-find-nodes.md)
- [Usage Guide](resources/guides/usage-guide.md)
- [License and Attribution](#license-and-attribution)

# Common Workflow Patterns

Here are some common workflow patterns you can use as a starting point:

## 1. HTTP Data Fetching

Fetch data from APIs and process it

Nodes used:
- HTTP Request
- Set
- IF

Example: Use HTTP Request node to fetch data from external APIs, Set node to transform formats, and IF node for conditional logic

## 2. Email Automation

Monitor emails and auto-respond or forward

Nodes used:
- Email Trigger (IMAP)
- Gmail
- IF

Example: Use Email Trigger to monitor inbox, IF node to filter specific conditions, and Gmail node to auto-reply or forward

## 3. Database Synchronization

Sync data between different systems

Nodes used:
- Schedule Trigger
- HTTP Request
- Postgres
- MySQL

Example: Scheduled trigger to read data from one database, transform it, and write to another database

## 4. Webhook Processing

Receive external webhooks and trigger actions

Nodes used:
- Webhook
- Set
- HTTP Request
- Slack

Example: Receive webhook events, process data, and send notifications to Slack or other systems

## 5. AI Assistant Integration

Use AI models to process and generate content

Nodes used:
- AI Agent
- OpenAI
- Vector Store
- Embeddings OpenAI

Example: Build AI assistants to handle user queries, integrate vector databases for semantic search

## 6. File Processing

Automatically process and transform files

Nodes used:
- Google Drive Trigger
- Extract from File
- Move Binary Data
- Dropbox

Example: Monitor Google Drive for new files, extract and process content, then upload to Dropbox

## Complete Template Library

We have collected 20 popular workflow templates from n8n.io, categorized by use case:

- [AI & Chatbots](resources/templates/ai-chatbots/README.md) - AI Agents, RAG systems, intelligent conversations
- [Social Media & Video](resources/templates/social-media/README.md) - TikTok, Instagram, YouTube automation
- [Data Processing & Analysis](resources/templates/data-processing/README.md) - Google Sheets, database integration
- [Communication & Collaboration](resources/templates/communication/README.md) - Email, WhatsApp, Telegram automation

See the [complete template index](resources/templates/README.md) for all available templates.


---

# License and Attribution

## This Skill Pack License

This skill pack project is licensed under the MIT License.
See: https://github.com/haunchen/n8n-skills/blob/main/LICENSE

## Important Notice

This is an unofficial educational project and is not affiliated with n8n GmbH.

This skill content is generated based on the following resources:
- n8n node type definitions (Sustainable Use License)
- n8n official documentation (MIT License)
- n8n-mcp project architecture (MIT License)

For detailed attribution information, please refer to the ATTRIBUTIONS.md file in the project.

## About n8n

n8n is an open-source workflow automation platform developed and maintained by n8n GmbH.

- Official website: https://n8n.io
- Documentation: https://docs.n8n.io
- Source code: https://github.com/n8n-io/n8n
- License: Sustainable Use License

---
description: MANDATORY rules for building n8n workflows - agents MUST follow this guide
globs: ["**/*"]
alwaysApply: true
---

# n8n Workflow Building Rules

**CRITICAL:** This rule is MANDATORY for ALL n8n workflow building tasks.

## 🚨 STEP 0: INFRASTRUCTURE VERIFICATION (MANDATORY - CANNOT SKIP)

**CRITICAL:** Before planning ANY workflow, you MUST verify the actual infrastructure.
**FAILURE TO DO THIS WILL RESULT IN BROKEN WORKFLOWS.**

### Required Infrastructure Checks

**EVERY TIME before building a workflow, run these checks:**

1. **Check docker-compose.yml** - What services are ACTUALLY available?
   ```
   Read: docker-compose.yml
   ```
   - What databases are running? (PostgreSQL, Neo4j, Qdrant, etc.)
   - What services are enabled? (Check profiles)
   - What ports/hostnames are used?

2. **Check existing database schemas** - What tables/collections EXIST?
   ```
   # For PostgreSQL - check what databases and tables exist
   Makafeli: create_workflow (simple query workflow to list tables)
   # OR use psql: \dt to list tables in each database
   ```

3. **Check Memory Bank** - What does techContext.md say about infrastructure?
   ```
   Read: memory-bank/techContext.md
   Read: memory-bank/systemPatterns.md
   ```

4. **List running credentials** - What's already configured in n8n?
   ```
   # Check what database credentials exist and their names
   ```

### Infrastructure Reality Checklist

Before proceeding, confirm:

- [ ] **Database Type:** What database(s) are available? (PostgreSQL with pgvector, NOT Supabase)
- [ ] **Database Host:** Container name or hostname (e.g., `postgres`, NOT `supabase`)
- [ ] **Existing Tables:** What tables/schemas already exist for this use case?
- [ ] **Credential Names:** What are the EXACT credential names in n8n?
- [ ] **Service Ports:** What ports are services running on?
- [ ] **Profiles Active:** Which docker compose profiles are enabled?

### Common Infrastructure Mistakes to AVOID

| Wrong Assumption | Reality Check |
|------------------|---------------|
| "Use PGVector" | Check docker-compose.yml - likely PostgreSQL with pgvector |
| "Table X exists" | Query the database to verify before building workflow |
| "Service Y is running" | Check `docker compose ps` or profiles in compose file |
| "Use credential named Z" | List actual credentials in n8n first |

### Example Infrastructure Verification

```
Step 0.1: Read docker-compose.yml
  → Found: postgres (pgvector/pgvector:pg17), neo4j, qdrant, redis
  → NOT found: supabase (it's just PostgreSQL!)

Step 0.2: Check existing tables
  → Connect to postgres, run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  → Found tables: literature, processed_files, embeddings, etc.

Step 0.3: Verify credential names in n8n
  → Makafeli: list credentials shows "Postgres Main" not "Supabase PostgresSQL"

Step 0.4: NOW proceed to workflow planning
```

**IF YOU SKIP STEP 0, YOUR WORKFLOW WILL FAIL.**

---

## 🚨 BEFORE BUILDING ANY WORKFLOW

### Step 1: Choose the Right MCP Tool

You have several n8n MCP tools available. Use the correct one:

| Task Type | Use This MCP | Tool Examples |
|-----------|--------------|---------------|
| **Design-time** (building, editing, analyzing) | **FlowEngine** | `build_workflow`, `add_node`, `validate_workflow`, `suggest_nodes` |
| **Runtime** (deploying, executing, managing) | **Makafeli** | `create_workflow`, `activate_workflow`, `execute_workflow`, `list_workflows` |

### MCP Tool Selection Decision Tree

```
What are you trying to do?
│
├─ Generate workflow from description?
│  └─ FlowEngine: build_workflow
│
├─ Add/edit/delete nodes?
│  └─ FlowEngine: add_node, edit_node, delete_node
│
├─ Validate workflow JSON?
│  └─ FlowEngine: validate_workflow
│
├─ Find nodes for a task?
│  └─ FlowEngine: suggest_nodes, search_nodes
│
├─ Analyze/explain workflow?
│  └─ FlowEngine: analyze_workflow, explain_workflow
│
├─ Deploy to n8n instance?
│  └─ Makafeli: create_workflow
│
├─ Activate/deactivate workflow?
│  └─ Makafeli: activate_workflow, deactivate_workflow
│
├─ Execute workflow manually?
│  └─ Makafeli: execute_workflow
│
├─ List/get existing workflows?
│  └─ Makafeli: list_workflows, get_workflow
│
├─ Manage tags/credentials?
│  └─ Makafeli: create_tag, create_credential
│
└─ Security audit of instance?
   └─ Makafeli: generate_audit
```

### Typical Workflow Building Process

1. **FlowEngine:** `suggest_architecture` - Get recommended pattern
2. **FlowEngine:** `build_workflow` - Generate initial workflow
3. **FlowEngine:** `add_node` / `edit_node` - Refine as needed
4. **FlowEngine:** `validate_workflow` - Validate and auto-fix
5. **FlowEngine:** `scan_security` - Security check
6. **Makafeli:** `create_workflow` - Deploy to n8n
7. **Makafeli:** `activate_workflow` - Enable the workflow
8. **Makafeli:** `execute_workflow` - Test execution
9. **Makafeli:** `get_execution` - Verify success

---

## 🔧 Node Selection Priority (MANDATORY)

**CRITICAL:** You MUST follow this priority order. NEVER skip to custom code.

### Priority 1: Native n8n Nodes (ALWAYS USE FIRST)

Check FlowEngine registry before anything else:
```
FlowEngine: search_nodes "your task"
FlowEngine: list_nodes_by_category "category"
FlowEngine: get_node_details "n8n-nodes-base.nodeName"
```

**Common native nodes:**
- HTTP Request (`n8n-nodes-base.httpRequest`)
- Webhook (`n8n-nodes-base.webhook`)
- PostgreSQL (`n8n-nodes-base.postgres`)
- Redis (`n8n-nodes-base.redis`)
- IF (`n8n-nodes-base.if`)
- Switch (`n8n-nodes-base.switch`)
- Set (`n8n-nodes-base.set`)
- Function (`n8n-nodes-base.function`)
- Merge (`n8n-nodes-base.merge`)
- Split In Batches (`n8n-nodes-base.splitInBatches`)

### Priority 2: Community Nodes (CHECK REGISTRY)

**MANDATORY:** Read the community node registry BEFORE building:
`framework/config/n8n/community-nodes-registry.json`

**FlowEngine does NOT know about community nodes!** You must check the registry.

**Key Community Nodes Available (37 total):**

| Node | Package | Use Instead Of |
|------|---------|----------------|
| **Supercode** | `@kenkaiiii/n8n-nodes-supercode` | Regular Code node (ALWAYS USE) |
| **Letta** | `@letta-ai/n8n-nodes-letta` | Custom memory management |
| **OpenWebUI** | `n8n-nodes-openwebui` | Custom LLM integrations |
| **Crawl4ai** | `@tavily/n8n-nodes-tavily` | Generic web search |
| **Tavily** | `@tavily/n8n-nodes-tavily` | Generic web search |
| **LightRAG** | `n8n-nodes-lightrag` | Custom RAG implementations |
| **SearXNG** | `n8n-nodes-searxng` | Multiple search API calls |
| **Firecrawl** | `@mendable/n8n-nodes-firecrawl` | Custom web scraping |
| **Neo4j** | `n8n-nodes-neo4j` | Code node with neo4j driver |
| **Langfuse** | `@langfuse/n8n-nodes-langfuse` | Custom observability |
| **WAHA** | `@devlikeapro/n8n-nodes-waha` | Custom WhatsApp integrations |

### Priority 3: Platform MCP Servers (CHECK REGISTRY)

**MANDATORY:** Check the MCP servers registry:
`framework/config/n8n/mcp-servers-registry.json`

**Platform MCP Servers Available in n8n:**

| Server | Tools | Use For |
|--------|-------|---------|
| **Agent_Toolkit-MCP** | 7 | Letta memory, Gmail, Calendar, Drive, Tasks |
| **Fin-MCP** | 10 | Crypto prices, stock data, technical indicators |
| **Infra-MCP** | 12 | Neo4j, PostgreSQL, Qdrant, Redis, GitHub |
| **Filesystem-MCP** | 6 | File system operations |
| **Context7-MCP** | 2 | Library documentation lookup |

**To use:** MCP Client node → Select server credential → Choose tool

### Priority 4: Code Node (LAST RESORT ONLY)

**STOP!** Before using Code node, verify:
- [ ] Did you search native nodes? (`search_nodes`)
- [ ] Did you check community nodes? (See registry)
- [ ] Did you check MCP Client option?
- [ ] Can Supercode handle this? (More powerful than Code)

**If you MUST use code:**
- Use **Supercode** node instead of regular Code node
- Supercode has: Better error handling, more libraries, better debugging
- Document WHY no prebuilt node works

---

## ⚠️ Supercode vs Code Node

**CRITICAL:** When code is necessary, use Supercode community node.

| Feature | Regular Code Node | Supercode Node |
|---------|-------------------|----------------|
| Libraries | Limited | Extensive (axios, lodash, moment, etc.) |
| Error Handling | Basic | Advanced with stack traces |
| Debugging | Minimal | Full debugging support |
| Modes | JavaScript only | JavaScript, Python, multiple modes |
| **Recommendation** | ❌ Avoid | ✅ Use this |

### Supercode Modes (CHECK THE MODE!)

**CRITICAL:** Agents often forget to set the correct mode. ALWAYS verify:

| Mode | Use For |
|------|---------|
| `runOnceForAllItems` | Process all items together (default for most cases) |
| `runOnceForEachItem` | Process each item individually |
| `manual` | Custom execution control |

**Before submitting workflow, verify:**
- [ ] Supercode mode is set correctly for the use case
- [ ] Error handling is configured
- [ ] Output format matches expected schema

---

## 📋 Workflow Building Checklist

### STEP 0: Infrastructure Verification (CANNOT SKIP)
- [ ] **READ docker-compose.yml** - Verified what services actually exist
- [ ] **CHECKED database schemas** - Verified what tables/collections exist
- [ ] **READ memory-bank/techContext.md** - Understood actual tech stack
- [ ] **LISTED n8n credentials** - Know exact credential names to use
- [ ] **DOCUMENTED infrastructure findings** - Wrote down what was found

### Before Building
- [ ] Searched for existing workflows (`Makafeli: list_workflows`)
- [ ] Determined architecture pattern (`FlowEngine: suggest_architecture`)
- [ ] Identified required nodes (`FlowEngine: suggest_nodes`)
- [ ] **READ community-nodes-registry.json** (FlowEngine doesn't know these!)
- [ ] **READ mcp-servers-registry.json** (Check platform MCP tools available)

### During Building
- [ ] Used native nodes first
- [ ] Used community nodes before custom code
- [ ] Set Supercode mode correctly (if using code)
- [ ] Added error handling (Error Trigger node)
- [ ] Added sticky notes for documentation

### After Building
- [ ] Validated workflow (`FlowEngine: validate_workflow`)
- [ ] Security scanned (`FlowEngine: scan_security`)
- [ ] **HANDOFF VALIDATION** (see below)
- [ ] Deployed to n8n (`Makafeli: create_workflow`)
- [ ] Activated (`Makafeli: activate_workflow`)
- [ ] Test executed (`Makafeli: execute_workflow`)
- [ ] Verified execution (`Makafeli: get_execution`)

### MANDATORY: Handoff Validation

**Before deploying ANY workflow, run the handoff validation:**

```bash
bash scripts/enforcement/validate-workflow-handoff.sh --file workflow.json
```

This script checks:
- Node selection (Supercode vs Code, native vs community)
- Error handling presence
- Trigger configuration
- Documentation
- OPA policy compliance

**If validation FAILS, the workflow CANNOT be deployed.**
**If validation has WARNINGS, review and document justifications.**

---

## 🏷️ Workflow Metadata (v3.0 Standards)

### Governance Levels

Every workflow MUST have a governance level tag:

| Level | Use For | Requirements |
|-------|---------|--------------|
| `CRITICAL` | Payment, auth, core systems | CTO approval, 24/7 monitoring |
| `STANDARD` | Most workflows | Team lead approval, SLA tracked |
| `EXPERIMENTAL` | Prototypes, testing | Self-serve, logged only |

### Required Metadata

```json
{
  "governance_level": "STANDARD",
  "owner": "team@company.com",
  "description": "What this workflow does",
  "tags": ["category", "purpose"],
  "sla_target_ms": 5000
}
```

### Adding Tags (After Deployment)

```
Makafeli: create_tag "governance:STANDARD"
Makafeli: update_workflow_tags workflowId ["governance:STANDARD", "category:automation"]
```

---

## 🔄 Error Handling Pattern

### Required Error Handler

Every workflow MUST include:

1. **Error Trigger Node** - Catches workflow errors
2. **Error Logger** - Logs to database or monitoring
3. **Notification** (for CRITICAL) - Slack/email alert

### Retry Configuration

```json
{
  "error_handling": {
    "strategy": "exponential_backoff",
    "max_retries": 3,
    "initial_delay_ms": 1000,
    "backoff_multiplier": 2.0,
    "max_delay_ms": 10000
  }
}
```

---

## 📊 Observability Requirements

### Structured Logging

Add logging at key points:
```javascript
// In Supercode node
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  workflow_id: $workflow.id,
  execution_id: $execution.id,
  level: "INFO",
  message: "Processing started",
  metadata: {
    item_count: items.length
  }
}));
```

### Metrics to Track

- Execution duration
- Success/failure rate
- Item throughput
- Error types

---

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Skip Infrastructure Verification (MOST CRITICAL)
```
// BAD - Assuming infrastructure without checking
"Let me build a workflow using Supabase..."  // Did you verify Supabase exists?
"I'll store this in the literature table..."  // Did you verify the table schema?
"Using credential 'Postgres Main'..."         // Did you list actual credential names?
```
✅ DO: ALWAYS read docker-compose.yml and verify database schemas BEFORE planning

### ❌ DON'T: Use Code node for HTTP requests
```javascript
// BAD - Don't do this
const response = await axios.get('https://api.example.com/data');
```
✅ DO: Use HTTP Request node

### ❌ DON'T: Use Code node for file operations
```javascript
// BAD - Don't do this
const fs = require('fs');
const data = fs.readFileSync('/path/to/file');
```
✅ DO: Use Read/Write File nodes

### ❌ DON'T: Hardcode credentials
```javascript
// BAD - Don't do this
const apiKey = "sk-1234567890";
```
✅ DO: Use n8n credentials store

### ❌ DON'T: Skip validation
✅ DO: Always run `FlowEngine: validate_workflow` before deploy

### ❌ DON'T: Deploy without testing
✅ DO: Always run `Makafeli: execute_workflow` and verify with `get_execution`

---

## 📚 Quick Reference

### FlowEngine Tools (Design-Time)
| Tool | Purpose |
|------|---------|
| `build_workflow` | Generate from description |
| `add_node` | Add node to workflow |
| `edit_node` | Modify node parameters |
| `delete_node` | Remove node |
| `add_connection` | Connect nodes |
| `validate_workflow` | Validate and auto-fix |
| `suggest_architecture` | Recommend pattern |
| `suggest_nodes` | Recommend nodes for task |
| `search_nodes` | Search 600+ node registry |
| `list_nodes_by_category` | List by category |
| `get_node_details` | Node documentation |
| `analyze_workflow` | Get insights |
| `explain_workflow` | Natural language explanation |
| `scan_security` | Security vulnerabilities |
| `analyze_performance` | Performance bottlenecks |

### Makafeli Tools (Runtime)
| Tool | Purpose |
|------|---------|
| `list_workflows` | List all workflows |
| `create_workflow` | Deploy new workflow |
| `get_workflow` | Get workflow by ID |
| `update_workflow` | Update existing |
| `delete_workflow` | Remove workflow |
| `activate_workflow` | Enable workflow |
| `deactivate_workflow` | Disable workflow |
| `execute_workflow` | Manual execution |
| `list_executions` | Execution history |
| `get_execution` | Execution details |
| `create_tag` | Create tag |
| `update_workflow_tags` | Assign tags |
| `create_credential` | Create credential |
| `generate_audit` | Security audit |
