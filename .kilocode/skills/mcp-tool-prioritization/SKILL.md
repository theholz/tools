---
name: mcp-tool-prioritization
description: 'Cursor rule: mcp-tool-prioritization. Use when following project rules for this topic.'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/MCP_TOOL_PRIORITIZATION.mdc"
---

# MCP Tool Prioritization

## When to Use n8n, Custom Code, Cursor Tools, or Other MCP Tools

**Integration:** MANDATORY_SEARCH_BEFORE_CODE protocol  
**Severity:** HIGH - Prevents code duplication & unnecessary complexity

## Purpose

Before implementing ANY feature/workflow/automation, determine the right tool:

1. **n8n Workflows** - Visual workflows, integrations, data transformation
2. **Custom Code** - Complex logic, specific algorithms, performance-critical
3. **Cursor MCP Tools** - File operations, memory, analysis, semantic search
4. **Other MCP Tools** - Specialized tools (alpaca-trading, financial-news, etc.)

**Rule:** Try in this order. Use FIRST tool that solves the problem.

## Decision Tree

```
Does this need to happen?
  ├─ YES → Is it a workflow/integration?
  │         ├─ YES → Can n8n do it natively?
  │         │         ├─ YES → USE N8N ✅
  │         │         │         └─ CRITICAL: Use built-in nodes first!
  │         │         │           └─ See N8N_WORKFLOW_RULES_ANALYSIS.md
  │         │         ├─ NO → Need custom code in n8n node?
  │         │         │       ├─ YES → USE CUSTOM CODE (minimal) ✅
  │         │         │       └─ NO → Use different tool or approach
  │         │         └─ Can we extend n8n with MCP tools?
  │         │             ├─ YES → USE MCP IN N8N ✅
  │         │             └─ NO → Continue below
  │         │
  │         └─ NO → Is it code/logic operation?
  │                 ├─ File operations? → USE CURSOR MCP TOOLS ✅
  │                 ├─ Memory/analysis? → USE CURSOR MCP TOOLS ✅
  │                 ├─ Semantic search? → USE CURSOR MCP TOOLS ✅
  │                 ├─ Specialized tool? → USE APPROPRIATE MCP ✅
  │                 └─ Complex logic? → USE CUSTOM CODE ✅
```

## Tool Comparison Matrix

| Scenario | n8n | Custom Code | Cursor MCP | Specialized MCP | Recommendation |
|----------|-----|-------------|-----------|-----------------|---|
| **API Integration** | ✅ Native HTTP | ⚠️ Possible | ❌ No | ❌ No | **n8n** |
| **Data Transformation** | ✅ Expressions | ⚠️ Possible | ❌ No | ❌ No | **n8n** |
| **Workflow Orchestration** | ✅ Native | ⚠️ Complex | ❌ No | ❌ No | **n8n** |
| **Trading Operations** | ⚠️ Limited | ✅ Full control | ❌ No | ✅ alpaca-trading | **alpaca-trading MCP** |
| **File Operations** | ❌ Limited | ⚠️ Possible | ✅ Optimal | ❌ No | **Cursor MCP** |
| **Semantic Search** | ❌ No | ⚠️ Complex | ✅ Optimal | ❌ No | **Cursor MCP** |
| **Decision Logging** | ❌ No | ⚠️ Possible | ✅ Optimal | ❌ No | **Cursor MCP** |
| **Complex Algorithm** | ❌ No | ✅ Optimal | ⚠️ Not ideal | ❌ No | **Custom Code** |
| **Financial Analysis** | ⚠️ Limited | ✅ Full control | ❌ No | ✅ financial-news | **financial-news MCP** |
| **Database Query** | ✅ Native | ⚠️ Possible | ❌ No | ✅ postgresql | **n8n + postgresql MCP** |

## Detailed Guidance

### 1. n8n Workflows (Primary Choice for Integrations)

**Use n8n when:**
- ✅ Integrating external APIs/services
- ✅ Data transformation/mapping between systems
- ✅ Scheduled/triggered workflows
- ✅ Visual workflow representation needed
- ✅ Non-technical users need to see logic
- ✅ Workflow state needs to persist

**DON'T use n8n when:**
- ❌ Complex algorithms (use custom code)
- ❌ Real-time performance critical (use custom code)
- ❌ File system operations (use Cursor MCP)
- ❌ Semantic search needed (use Cursor MCP)
- ❌ Decision logging (use Memory Bank MCP)

**Examples:**

```
✅ USE N8N:
- Fetch trading price from API → Transform data → Store in PostgreSQL
- Monitor webhook → Parse payload → Trigger notification
- Scheduled job: Query database → Run analysis → Send report

❌ DON'T USE N8N (use custom code):
- Machine learning model inference (slow in n8n)
- Complex mathematical calculations
- Custom parsing of non-standard formats
- Real-time decision making (<50ms latency requirement)
```

**Checklist:**
- [ ] Does this integrate external systems?
- [ ] Can it be done with n8n nodes + basic expressions?
- [ ] Is it a workflow (sequence of operations)?
- [ ] Does it need to be visual/auditable?
- If ALL yes → **USE N8N**

### 2. Custom Code (When n8n Can't Do It)

**Use custom code when:**
- ✅ n8n cannot natively do what's needed
- ✅ Algorithm is complex (ML, heavy math, etc.)
- ✅ Real-time performance critical
- ✅ Need access to system resources
- ✅ Trading logic or financial calculations

**Where to put custom code:**
- In n8n as "Code" or "Execute Python" node (light logic)
- In standalone Python service (heavy logic)
- In src/services/[service]/ (persistent code)

**IMPORTANT:** Before writing custom code, check:
1. Does n8n have a node for this? (check integrations list)
2. Can an MCP tool do this? (search before coding)
3. Is there existing code we can reuse? (mandatory search)

**Examples:**

```
✅ USE CUSTOM CODE:
- Calculate trading indicator (ATR, TABI, LILO)
- Implement portfolio rebalancing algorithm
- Real-time decision engine (sub-50ms response)
- Custom data validation logic

❌ DON'T USE CUSTOM CODE (too simple for standalone):
- Simple HTTP call (use n8n HTTP node)
- Basic data mapping (use n8n expression)
- API authentication (n8n handles this)
```

**Checklist:**
- [ ] Searched n8n integrations (does native node exist)?
- [ ] Checked if MCP tool can do this?
- [ ] Searched existing code (is this already implemented)?
- [ ] Confirmed n8n cannot do it?
- [ ] Confirmed performance requirement justifies complexity?
- If ALL yes → **USE CUSTOM CODE**

### 3. Cursor MCP Tools (File Operations, Memory, Analysis)

**Use Cursor MCP when:**
- ✅ File system operations (read/write)
- ✅ Memory operations (get/update context)
- ✅ Semantic search (Memory Bank)
- ✅ Complex analysis of data
- ✅ Decision logging
- ✅ Progress tracking

**Available Cursor MCP Tools:**
```
Memory Operations:
  └─ get_active_context()
  └─ update_active_context()
  
Decision/Knowledge:
  └─ log_decision()
  └─ semantic_search_memory-bank()
  
File Operations:
  └─ read_file()
  └─ write_file()
  └─ list_files()
  
Sequential Thinking:
  └─ sequential_thinking()
```

**Examples:**

```
✅ USE CURSOR MCP:
- Search for existing connection pool patterns before coding
  semantic_search_memory-bank("connection pool", top_k=5)
  
- Log architectural decision to Memory Bank
  log_decision(type="ARCHITECTURE_DECISION", ...)
  
- Load current phase to verify we can proceed
  context = get_active_context()
  
- Update progress tracking
  update_active_context(status="BLOCKED")

❌ DON'T USE CURSOR MCP (use n8n or code):
- Production data transformations (slow)
- Scheduled jobs (use n8n)
- API calls (use n8n)
```

**Checklist:**
- [ ] Is this about memory/context/decisions?
- [ ] Is this file operations?
- [ ] Is this semantic search?
- [ ] Is this decision logging?
- If ANY yes → **USE CURSOR MCP**

### 4. Specialized MCP Tools (Domain-Specific)

**Available MCP Tools:**

| Tool | Use For | Example |
|------|---------|---------|
| **alpaca-trading** | Trading operations, portfolio mgmt | Execute trades, get account balance |
| **financial-news** | Market news, sentiment analysis | Fetch news articles, analyze sentiment |
| **twitter-sentiment** | Social media sentiment | Get Twitter sentiment for stocks |
| **ia-coaching** | InvestAnswers analysis | Get coaching/guidance from IA database |
| **ia-historical-analysis** | Historical market data | Query historical trading data |
| **postgresql** | Database operations | Query/write to database |
| **playwright** / **puppeteer** | Web automation | Scrape websites, test web interfaces |
| **github** | GitHub operations | Push commits, create PRs |
| **google-sheets** / **gmail** | Google services | Read/write sheets, send emails |

**Example Usage:**

```
✅ USE ALPACA-TRADING MCP:
- Get current account balance
- Check portfolio positions
- Execute trade
- Get market data for symbol
→ Never reimplement in custom code

✅ USE FINANCIAL-NEWS MCP:
- Fetch news articles about stock
- Get sentiment analysis
- Search for breaking news
→ Much simpler than scraping

✅ USE POSTGRESQL MCP:
- Direct database queries
- Insert/update operations
- Complex joins
→ From n8n or code, use this MCP

❌ DON'T USE SPECIALIZED MCP (use n8n instead):
- Data transformation (n8n is better)
- Simple API calls (n8n has HTTP node)
- Scheduled jobs (n8n has scheduler)
```

**Checklist:**
- [ ] Is there a specialized MCP for this domain?
- [ ] Does it do exactly what I need?
- [ ] Is it more efficient than alternatives?
- If ALL yes → **USE SPECIALIZED MCP**

## Decision Workflows

### Workflow 1: New Workflow/Integration

```
REQUEST: Create workflow to [description]

STEP 1: Can n8n do it natively?
  └─ Check n8n integrations list
  └─ Look for existing nodes
  └─ If found → USE N8N ✅

STEP 2: If not in n8n, is there an MCP tool?
  └─ Search: alpaca-trading, financial-news, etc.
  └─ If found and applicable → USE MCP ✅

STEP 3: If neither, does it need custom code?
  └─ Logic too complex for n8n expressions?
  └─ Performance critical?
  └─ If yes → USE CUSTOM CODE ✅

STEP 4: Build solution with chosen tool(s)
  └─ Primary tool: [chosen]
  └─ Supporting tools: [if needed]
```

### Workflow 2: Data Operation (File, Memory, Search)

```
REQUEST: [Operation on data]

STEP 1: Is this file/memory/search operation?
  ├─ File read/write? → USE CURSOR MCP ✅
  ├─ Memory get/update? → USE CURSOR MCP ✅
  ├─ Semantic search? → USE CURSOR MCP ✅
  └─ Otherwise → Continue

STEP 2: Can n8n do it with nodes?
  └─ If yes → USE N8N ✅
  └─ If no → Continue

STEP 3: Use custom code or specialized MCP
  └─ Complex logic? → USE CUSTOM CODE ✅
  └─ Specialized domain? → USE MCP ✅
```

### Workflow 3: Complex Logic Implementation

```
REQUEST: Implement [complex feature]

STEP 0: Before coding, MANDATORY SEARCH
  └─ semantic_search_memory-bank("feature description")
  └─ Check if exists → REUSE ✅
  └─ If not found → Continue

STEP 1: Is this an integrations workflow?
  └─ Multiple systems involved?
  └─ Data transformation?
  └─ If yes → USE N8N ✅

STEP 2: Is there an MCP tool for this?
  └─ Search MCP tools list
  └─ If found → USE MCP ✅

STEP 3: Algorithm or real-time logic?
  └─ Complex algorithm? → USE CUSTOM CODE ✅
  └─ Performance critical? → USE CUSTOM CODE ✅

STEP 4: Where to implement?
  └─ Light logic in n8n node? → n8n CODE node
  └─ Persistent service? → src/services/[service]/
  └─ Shared utility? → src/utils/ or similar
```

## Mandatory Search Protocol

**Before ANY code implementation:**

```
1. Read curated documentation (OPA-enforced):
   → docs/reference/tools/tool-registry.md - Complete tool registry
   → docs/reference/n8n-platform-standards/index.md - n8n platform standards
   → Specific tool/node documentation (MCP, community nodes, built-in nodes)

2. Search semantic_search_memory-bank("what you're building")
3. Document: "Found X existing implementations"
4. Decision: "Reuse / Adapt / Create new"
5. If reuse: "Using [X] because [reason]"
6. If create: "No existing found, proceed with custom"
7. Log to Memory Bank with decision type
```

**OPA Enforcement:**
- **Policy:** `opa/policies/documentation-reading-enforcement.rego`
- **Check Command:** `bash scripts/enforcement/check-opa-policy.sh documentation-reading ACT`
- **Status:** ✅ **ACTIVE** - Blocks tool usage if documentation not read

**This prevents:**
- ✅ Writing code that already exists
- ✅ Duplicating n8n workflows
- ✅ Reimplementing patterns
- ✅ Wasting time on solved problems

## Tool Selection Checklists

### Checklist: Should we use n8n?

- [ ] Does n8n have a native node for this?
- [ ] Can it be expressed as data flow (input → transform → output)?
- [ ] Is visual representation useful for non-technical users?
- [ ] Does workflow state need to persist between runs?
- [ ] Is performance acceptable for workflow interpretation?
- [ ] Can logic be expressed in n8n expressions?

**If 5+ yes → USE N8N**

### Checklist: Should we use Cursor MCP?

- [ ] Is this about memory/context management?
- [ ] Is this about file operations?
- [ ] Is this about semantic search?
- [ ] Is this about decision logging?
- [ ] Does it relate to project state tracking?

**If ANY yes → USE CURSOR MCP**

### Checklist: Should we use specialized MCP?

- [ ] Is there an MCP tool for this domain?
- [ ] Does it have all functions we need?
- [ ] Is it more efficient than alternatives?
- [ ] Is it maintained/reliable?

**If ALL yes → USE SPECIALIZED MCP**

### Checklist: Should we use custom code?

- [ ] Have we searched for existing implementation?
- [ ] Can n8n not do this (tried above)?
- [ ] Can MCP tools not do this?
- [ ] Is the algorithm complex or performance-critical?
- [ ] Do we need fine-grained control?

**If ALL yes → USE CUSTOM CODE**

## External LLM Requirements

### ⚠️ CRITICAL: External LLMs MUST Use Supergateway

**External LLMs (non-Cursor integrated models) cannot access stdio-based MCP servers. They MUST use Supergateway HTTP endpoints:**

- `http://supergateway-memory-bank:8000/mcp` - Memory Bank MCP (REQUIRED)
- `http://supergateway-n8n-workflow-builder:8000/mcp` - n8n Workflow Builder MCP (MANDATORY for workflow operations)
- `http://supergateway-desktop-commander:8000/mcp` - Desktop Commander MCP
- `http://supergateway-infrastructure:8000/mcp` - Platform Infrastructure MCP
- `http://supergateway-agent-toolkit:8000/mcp` - Platform Agent Toolkit MCP
- `http://supergateway-financial:8000/mcp` - Platform Financial MCP

**⚠️ CRITICAL: Single Access Method for n8n Workflow Builder**
- **ALL LLMs (Cursor and External) MUST use:** `http://supergateway-n8n-workflow-builder:8000/mcp`
- **DO NOT use stdio MCP** - This creates confusion and inconsistency
- **Consistent for all LLMs** - Cursor, Open WebUI, LangGraph, and other external LLMs all use the same HTTP endpoint

**⚠️ CRITICAL: 7 Mandatory Tools (OPA-ENFORCED)**
When using n8n-workflow-builder MCP, ALL 7 tools are mandatory:
1. `search_workflows` - Before creating (prevents duplicates)
2. `create_tag` - For organization
3. `update_workflow_tags` - To assign tags
4. `create_workflow` - To create workflow
5. `generate_audit` - For security check
6. `execute_workflow` - For testing
7. `get_execution` - To verify execution success

**OPA Enforcement:**
- **Policy:** `opa/policies/n8n-workflow-builder-enforcement.rego`
- **Check:** `bash scripts/enforcement/check-opa-policy.sh n8n-workflow-builder ACT`
- **Blocks:** Workflow completion if any tool is missing

**See:** `.cursor/rules/n8n-standards-enforcement.mdc` for complete n8n workflow requirements

**MANDATORY Tools for External LLMs:**

1. **Memory Bank MCP** - **MUST** use at session start:
   - `get_active_context` - Get current work focus
   - `log_decision` - Log all architectural decisions
   - `log_progress` - Log task/epic/story updates
   - `semantic_search_memory-bank` - Search before creating code

2. **Platform Infrastructure MCP** - For file/infrastructure operations:
   - `fs_read`, `fs_write` - File operations
   - `list_docker_containers` - Infrastructure management

3. **Desktop Commander MCP** - Fallback only (use structured MCPs first)

**See:**
- [External LLM Onboarding](../../docs/guides/external-llm-onboarding.md) - **START HERE**
- [Required MCP Tools for External LLMs](../../docs/reference/tools/required-mcp-tools-external-llms.md)
- [Supergateway External LLM Access](../../docs/services/supergateway/external-llm-access.md)

**No Authentication Required:** Supergateway services do not use tokens. They are HTTP endpoints accessible within the Docker network.

## Violations

### Violation 1: Wrote Code That n8n Can Do

```
❌ Example: Wrote Python script to fetch price from API

Should have: Used n8n HTTP node
Impact: 
  - Wasted 2 hours coding
  - Creates maintenance burden
  - Harder for non-technical users to modify

Prevention:
  - Check n8n integrations first
  - Log_decision: "Checked n8n, found HTTP node"
```

### Violation 2: Ignored MCP Tool

```
❌ Example: Wrote custom code to query PostgreSQL

Should have: Used postgresql MCP tool
Impact:
  - Reinvented wheel
  - Added complexity
  - More things to maintain

Prevention:
  - Search for MCP tool before coding
  - Check available MCP tools list
```

### Violation 3: Didn't Search Before Coding

```
❌ Example: Implemented trading indicator from scratch

Should have: Searched Memory Bank for existing indicators
Impact:
  - 8 hours wasted implementing
  - Discovery after commit it already exists
  - Must refactor to reuse

Prevention:
  - MANDATORY_SEARCH_BEFORE_CODE
  - semantic_search_memory-bank() before ANY coding
  - Document search results
```

## Quick Reference

**Fast Decision Table:**

| I need to... | Use | Why |
|---|---|---|
| ...integrate APIs | n8n | Native HTTP, OAuth, etc. |
| ...transform data | n8n | Expressions, mapping |
| ...schedule workflow | n8n | Built-in scheduler |
| ...read/write files | Cursor MCP | Optimal for files |
| ...search decisions | Cursor MCP | Semantic search |
| ...log decisions | Cursor MCP | Memory Bank integration |
| ...execute trades | alpaca-trading MCP | Purpose-built |
| ...get news/sentiment | financial-news MCP | Domain-specific |
| ...query database | postgresql MCP | Direct DB access |
| ...complex algorithm | Custom Code | Full control |
| ...real-time logic | Custom Code | Performance |
| ...custom validation | Custom Code | Flexibility |

  - Must refactor to reuse

Prevention:
  - MANDATORY_SEARCH_BEFORE_CODE
  - semantic_search_memory-bank() before ANY coding
  - Document search results
```

## Quick Reference

**Fast Decision Table:**

| I need to... | Use | Why |
|---|---|---|
| ...integrate APIs | n8n | Native HTTP, OAuth, etc. |
| ...transform data | n8n | Expressions, mapping |
| ...schedule workflow | n8n | Built-in scheduler |
| ...read/write files | Cursor MCP | Optimal for files |
| ...search decisions | Cursor MCP | Semantic search |
| ...log decisions | Cursor MCP | Memory Bank integration |
| ...execute trades | alpaca-trading MCP | Purpose-built |
| ...get news/sentiment | financial-news MCP | Domain-specific |
| ...query database | postgresql MCP | Direct DB access |
| ...complex algorithm | Custom Code | Full control |
| ...real-time logic | Custom Code | Performance |
| ...custom validation | Custom Code | Flexibility |
