---
name: standards-enforcement
description: MANDATORY standards enforcement - agents must follow documented best practices
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/standards-enforcement.mdc"
---

# 🚨 MANDATORY Standards Enforcement Protocol

## ⚠️ CRITICAL: Follow Documented Standards

**BEFORE implementing ANY feature, agents MUST:**
1. ✅ **Read relevant standards documentation**
2. ✅ Check for existing tools/workflows
3. ✅ Query dependencies (Neo4j CMDB)
4. ✅ Verify against best practices
5. ✅ Use available infrastructure (n8n, PGVector, Neo4j, Letta)

---

## 📋 Pre-Implementation Checklist (MANDATORY)

### Step 1: Read Standards Documentation

**For n8n workflows:**
- [ ] Read `docs/n8n/N8N_WORKFLOW_STANDARDS.md`
- [ ] Check `docs/n8n/N8N_COMMUNITY_NODES_REFERENCE.md`
- [ ] Review `docs/n8n/workflows/CORE_SERVICES_TEMPLATE_README.md`
- [ ] Check for existing workflows in `docs/n8n/workflows/`
- [ ] Read `.cursor/rules/N8N_WORKFLOW_RULES_ANALYSIS.md`

**For CopilotKit integration:**
- [ ] Read `copilotkit/.cursor/rules/copilotkit-patterns.mdc` (if exists)
- [ ] Read `copilotkit/.cursor/rules/letta-integration.mdc` (if exists)
- [ ] Verify using `ag-ui-langgraph` (NOT `copilotkit` Python SDK)
- [ ] Check AG-UI protocol compliance

**For Robinhood integration:**
- [ ] Read `.cursor/rules/robinhood-protocol.mdc`
- [ ] Verify "Browser Context + AI" framework
- [ ] Ensure NO automated scraping code
- [ ] Confirm user confirmation step included

**For infrastructure changes:**
- [ ] Read `docs/runbooks/PAIN_POINTS_ANALYSIS.md` (if exists)
- [ ] Read `docs/project/ARCHITECTURE.md` (if exists)
- [ ] Review service dependencies in Neo4j CMDB
- [ ] Check `.cursor/rules/system-patterns.mdc`
- [ ] Check `.cursor/rules/data-organization.mdc` (data storage decisions)

---

### Step 2: Check Available Tools & Services

**Before writing code, verify these exist:**

#### 🔴 n8n Workflows (CHECK FIRST)
- [ ] Is there an existing n8n workflow for this?
- [ ] Can this be done with n8n instead of code?
- [ ] Check `docs/n8n/workflows/` for patterns
- [ ] Use built-in nodes (not Code nodes)
- [ ] Use community nodes (Supercode, MCP Client, etc.)

**Decision Tree:**
```
Need automation?
│
├─ Can n8n workflow do this?
│  └─ YES → Use n8n (don't write code)
│
└─ NO → Then write code (document why n8n won't work)
```

#### 🔴 PostgreSQL & Vector Storage (DEFAULT FOR DATA STORAGE)
- [ ] Do you need to store data? → **DEFAULT: Use PostgreSQL (platform-core)**
- [ ] Do you need PostgreSQL? → **DEFAULT: Use PostgreSQL in platform-core (platform-core:5432)**
- [ ] Do you need vector storage? → **DEFAULT: Use Qdrant** (see exceptions below)
- [ ] Do you need relational data? → **DEFAULT: Use PostgreSQL (platform-core)**
- [ ] Do you need vector + relational in one DB? → **Use PostgreSQL pgvector** (platform-core has pgvector extension)

**Vector Storage Architecture:**
- **Qdrant** = Primary vector database for all vector operations (DEFAULT) ✅
- **PostgreSQL pgvector** = Vector + relational data in one database ✅
- **ChromaDB** = Memory Bank local storage (per-workspace, embedded) - Leave as-is ✅

**Decision Tree:**
```
Need to store data?
│
├─ Vector/Embeddings Data?
│  ├─ Codebase indexing (Roo Code)? → Use Qdrant ✅
│  ├─ Memory Bank semantic search? → Documented? 
│  ├─ Need vector + relational in one DB? → Use PostgreSQL pgvector ✅
│  └─ Documents, RAG, general vectors? → **DEFAULT: Use Qdrant** ✅
│
├─ Structured/Relational Data?
│  └─ YES → **DEFAULT: Use PostgreSQL (platform-core:5432)** ✅
│
├─ Relationships/Graph Data?
│  └─ YES → Use Neo4j
│
├─ Key-value cache?
│  └─ YES → Use Redis
│
└─ Files?
   └─ Prefer PGVector Storage (local filesystem allowed when appropriate)
```

**Exception Process:**
If you need to use standalone PostgreSQL instead of PGVector:
1. Document the reason (e.g., "n8n requires its own PostgreSQL for workflow storage")
2. Log decision to Memory Bank with tag `database_choice_exception`
3. Update CMDB to mark dependency as "required" (not optional)

**Reference:** See `system-patterns.mdc` for "Data Storage Decision Tree"

#### 🔴 Neo4j (CHECK FOR RELATIONSHIPS)
- [ ] Do you need to query relationships? → Use Neo4j
- [ ] Do you need to check dependencies? → Query Neo4j CMDB
- [ ] Do you need knowledge graph? → Use Neo4j
- [ ] **ALWAYS** query CMDB before making changes

**Before making changes:**
```cypher
// Query what depends on the service you're changing
MATCH (s:Service {name: "n8n"})-[:DEPENDS_ON*]->(dep:Service)
RETURN dep.name, dep.type

// Query what files are related
MATCH (s:Service {name: "n8n"})-[:DEFINED_IN]->(f:File)
RETURN f.path
```

#### 🔴 Letta (CHECK FOR AGENT MEMORY)
- [ ] Do you need stateful conversations? → Consider Letta
- [ ] Do you need archival memory? → Consider Letta
- [ ] Do you need domain-specific agents? → Consider Letta API
- [ ] **OPTION**: Use Letta when appropriate, but custom memory solutions are allowed when needed

**Decision Tree:**
```
Need agent memory?
│
├─ Stateful conversations?
│  └─ YES → Consider Letta API (or custom solution if needed)
│
├─ Archival memory?
│  └─ YES → Consider Letta (or custom solution if needed)
│
└─ Domain-specific agent?
   └─ YES → Consider Letta agent ID (or custom solution if needed)
```

#### 🔴 Robinhood Integration (CHECK FOR DATA)
- [ ] Do you need crypto/stock prices? → Use Robinhood API (via User)
- [ ] Do you need funding rates? → Use Coinglass
- [ ] **NEVER** scrape data if Robinhood has it
- [ ] **NEVER** use paid APIs if Robinhood has it (unless critical)

**Data Priority:**
```
1. Robinhood (FREE)
2. Direct Blockchain (FREE)
3. Paid APIs (Last Resort)
```

**Reference:** See `.cursor/rules/robinhood-protocol.mdc` for complete protocol

---

### Step 3: Query Dependencies (Neo4j CMDB)

**BEFORE making changes, query dependencies:**

```bash
# Use smart-codebase-loader to check dependencies
python scripts/cmdb/smart-codebase-loader.py \
  --service n8n \
  --check-dependencies

# Or query Neo4j directly
cypher-shell -u neo4j -p $NEO4J_PASSWORD \
  "MATCH (s:Service {name: 'n8n'})-[:DEPENDS_ON*]->(dep:Service) RETURN dep"
```

**What to check:**
- [ ] What services depend on what I'm changing?
- [ ] What files are related to this service?
- [ ] What environment variables are used?
- [ ] What workflows use this service?

---

### Step 4: Verify Against Best Practices

**For n8n workflows:**
- [ ] **MANDATORY: Use all 7 required MCP tools**
  - [ ] `search_workflows` - Before creating (prevents duplicates)
  - [ ] `create_tag` - For organization
  - [ ] `update_workflow_tags` - To assign tags
  - [ ] `generate_audit` - For security check
  - [ ] `execute_workflow` - For testing
  - [ ] `get_execution` - To verify execution success
  - [ ] `create_workflow` - To create workflow
- [ ] Uses built-in nodes (not Code nodes)
- [ ] Uses community nodes where appropriate
- [ ] Has error handling workflow
- [ ] Has sticky note documentation
- [ ] Follows naming convention: `[Category] - [Action] - [Target]`
- [ ] Credentials stored in n8n (not hardcoded)
- [ ] **OPA Policy Check:** Run `python scripts/enforcement/run-opa-check.py --policy n8n_workflow_standards --workflow <workflow_file>` before completion

**See:** `.cursor/rules/n8n-standards-enforcement.mdc` for complete n8n workflow requirements

**For code changes:**
- [ ] Follows existing patterns
- [ ] Uses available infrastructure
- [ ] Doesn't duplicate existing functionality
- [ ] Integrates with core services

---

## 🚫 FORBIDDEN Patterns

### ❌ NEVER Do This:

```javascript
// ❌ DON'T: Use Code node for file operations
const fs = require('fs');
const data = fs.readFileSync('/path/to/file');

// ✅ DO: Use Read File node
```

```python
# ❌ DON'T: Use copilotkit Python SDK
from copilotkit import CopilotKit

# ✅ DO: Use ag-ui-langgraph
from ag_ui_langgraph import AGUIAgent
```

```javascript
// ✅ PREFERRED: Use PGVector for structured data
await PGVector.from('table').insert(data);

// ✅ ALSO ALLOWED: File storage when appropriate
fs.writeFileSync('data.json', JSON.stringify(data));  // Acceptable when file storage fits the use case
```

```python
# ✅ PREFERRED: Use Letta when appropriate
response = await letta_client.add_to_memory(content)

# ✅ ALSO ALLOWED: Custom memory solutions when needed
memory = {}  # Custom memory is acceptable when it fits the use case
```

```bash
# ❌ DON'T: Create Python script for automation
python my_automation.py

# ✅ DO: Create n8n workflow
# (unless n8n can't handle it - then document why)
```

---

## ✅ REQUIRED Patterns

### For n8n Workflows:

1. **Use built-in nodes first:**
   - File operations → Read/Write File node
   - HTTP calls → HTTP Request node
   - Database → Postgres/Redis/Neo4j nodes
   - Conditionals → IF/Switch nodes

2. **Use community nodes:**
   - Complex calculations → Supercode node
   - MCP integration → MCP Client node
   - Web scraping → Firecrawl/Crawl4AI+ nodes

3. **Document everything:**
   - Sticky note with purpose/owner/triggers
   - Descriptive node names
   - README for complex workflows

**Reference:** See `.cursor/rules/N8N_WORKFLOW_RULES_ANALYSIS.md` for complete standards

### For Code Changes:

1. **Check existing infrastructure:**
   - PGVector for data
   - Neo4j for relationships
   - Letta for memory
   - n8n for automation

2. **Query dependencies:**
   - Neo4j CMDB before changes
   - Check what depends on your change
   - Verify no breaking changes

3. **Follow documented patterns:**
   - Read standards docs
   - Use existing templates
   - Match code style

---

## 🔍 Validation Before Delivery

**Before marking any task complete:**

- [ ] Read relevant standards documentation
- [ ] Used available tools (n8n, PGVector, Neo4j, Letta)
- [ ] Checked dependencies (Neo4j CMDB)
- [ ] Followed best practices
- [ ] No forbidden patterns used
- [ ] Documentation updated

---

## 📊 Integration with Session Initialization

This rule works **WITH** session initialization:

1. **Load codebase** (vibe-tools) → Get current state
2. **Load standards** (this rule) → Know what to do
3. **Load dependencies** (Neo4j CMDB) → Understand implications
4. **Load tool inventory** (checklist) → Remember what's available

**Together, they ensure:**
- ✅ Agents have full context
- ✅ Agents follow standards
- ✅ Agents use available tools
- ✅ Agents understand implications

---

## 🎯 Success Criteria

An agent is following standards when:

1. ✅ Checks n8n workflows before writing automation code
2. ✅ Prefers PGVector for data storage (file storage allowed when appropriate)
3. ✅ Queries Neo4j CMDB before making changes
4. ✅ Considers Letta for agent memory (custom solutions allowed when needed)
5. ✅ Follows documented patterns
6. ✅ Uses built-in nodes in n8n (not Code nodes)
7. ✅ Documents decisions and trade-offs

---

**Remember**: The goal isn't just "load the codebase" - it's **"follow best practices and use available tools."**
