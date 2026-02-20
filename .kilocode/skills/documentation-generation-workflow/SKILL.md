---
name: documentation-generation-workflow
description: 'Cursor rule: documentation-generation-workflow. Use when following project rules for this topic.'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/DOCUMENTATION_GENERATION_WORKFLOW.mdc"
---

# Documentation Generation Workflow

## Overview

This document defines the complete workflow for when and how Cursor generates and maintains documentation, ensuring consistency, completeness, and proper integration with Memory Bank and the wiki system.

**Purpose:** Single source of truth for documentation generation process, from initial request through wiki integration.

---

## When to Generate Documentation

**Mandatory Triggers:**
1. **After new service created** - PHASE 8 of SERVICE_LAUNCH_CHECKLIST (see `add-new-service.mdc`)
2. **After major feature implemented** - When feature is complete
3. **After architectural decision made** - When decision is logged in Memory Bank
4. **After workflow created/modified** - When workflow is added/changed
5. **When user explicitly requests docs** - User asks: "Document [component]"

**Optional Triggers:**
- When code changes significantly
- When configuration options change
- When API endpoints are added/modified
- When troubleshooting reveals new issues

---

## Documentation Generation Workflow

### Step 1: Understand Documentation Need

**When:** Cursor receives request to document [component]

**Process:**
```
1. Identify content type
   ├─ Ask: "Is this service/feature/workflow/architecture/business logic?"
   ├─ Reference: DOCUMENTATION_CONTENT_TYPES.mdc
   └─ Determine required sections

2. Check what exists
   ├─ Search Memory Bank for existing docs (semantic_search_memory-bank)
   ├─ Search wiki for existing documentation (glob_file_search)
   ├─ Log: "Found [X] existing docs" or "No existing docs found"
   └─ If found: Use as reference/update existing (see Update Workflow below)

3. Identify dependencies
   ├─ What services does this depend on?
   ├─ What features does this support?
   ├─ What diagrams are needed?
   └─ Create dependency list

4. Gather information
   ├─ Code references (GitHub links)
   ├─ Architecture decisions (from Memory Bank)
   ├─ Configuration options (from code/config files)
   ├─ API definitions (from code/OpenAPI specs)
   └─ Related documentation (cross-references)

5. ⚠️ ENFORCEMENT CHECKS (MANDATORY BEFORE GENERATION)
   ├─ Check if doc type requires template (see DOCUMENTATION_CONTENT_TYPES.mdc)
   ├─ Verify template exists in docs/reference/templates/
   ├─ Verify location is correct (use WIKI_STRUCTURE_MKDOCS.mdc)
   ├─ Verify Memory Bank links planned (if applicable)
   └─ BLOCK creation if any check fails
```

**Step 1: Identify Content Type**
```python
# Determine documentation type
if component_type == "service":
    content_type = "Type 1: Service Overview"
elif component_type == "architecture":
    content_type = "Type 2: Architecture Document"
elif component_type == "api":
    content_type = "Type 7: API Reference"
# ... etc (see DOCUMENTATION_CONTENT_TYPES.mdc for all types)
```

**Step 2: Check Existing Documentation**
```python
# Search Memory Bank for existing docs
existing_docs = semantic_search_memory-bank(
    workspace_id="${DATA_ROOT}/platform",
    query_text=f"documentation for {component_name}",
    filter_item_types=["custom_data"],
    filter_custom_data_categories=["documentation"]
)

# Search wiki directory
wiki_docs = glob_file_search(f"docs/**/{component_name}*.md")

# If found, determine: update existing or create new?
# See "When to Create New vs Update Existing" section below
```

**Step 3: Gather Information**
- Code references (GitHub links)
- Architecture decisions (from Memory Bank)
- Configuration options (from code/config files)
- API definitions (from code/OpenAPI specs)
- Related documentation (cross-references)

---

### Step 2: Generate Documentation

**Process:**
```
1. Select template
   └─ Use appropriate template from documentation-templates.mdc
   └─ **Templates are PRIMARY SOURCE** - follow exactly

2. Write content
   ├─ Follow template structure exactly
   ├─ Include all required sections from template
   ├─ Use clear, precise language
   ├─ Add code examples where applicable
   └─ Include diagrams (Mermaid format) - see DIAGRAM_GENERATION_RULES.mdc

3. Add metadata
   ├─ Add YAML front matter (use template's exact format)
   ├─ Add keywords and tags (template shows examples)
   ├─ Set review_frequency and next_review_date
   └─ Include Memory Bank references

4. Add cross-references
   ├─ Link to related docs
   ├─ Link to dependencies
   ├─ Link to source code
   └─ Format per DOCUMENTATION_CROSS_REFERENCE_RULES.mdc

5. Validate
   ├─ Check markdown syntax
   ├─ Verify all links work (relative paths)
   ├─ Test Mermaid diagrams render
   ├─ Check code examples are correct
   └─ Verify file location per WIKI_STRUCTURE_MKDOCS.mdc
```

**Template Selection:**
```python
# Select template based on content type
# PRIMARY SOURCE: documentation-templates.mdc
template = get_template_from_documentation_templates(content_type)

# Fill template with gathered information
documentation = fill_template(
    template=template,
    component_name=component_name,
    architecture=architecture_info,
    configuration=config_info,
    api=api_info,
    related_docs=related_docs
)
```

**Diagram Generation:**
```python
# Generate Mermaid diagram if needed
# See DIAGRAM_GENERATION_RULES.mdc for diagram types and templates
if needs_diagram:
    diagram = generate_mermaid_diagram(
        component=component_name,
        dependencies=dependencies,
        data_flow=data_flow
    )
    documentation.add_diagram(diagram)
```

**Cross-Reference Generation:**
```python
# Generate cross-references
# See DOCUMENTATION_CROSS_REFERENCE_RULES.mdc for format
cross_refs = generate_cross_references(
    component=component_name,
    dependencies=dependencies,
    related_services=related_services
)
documentation.add_section("Related Documentation", cross_refs)
```

---

### Step 3: Integrate with Wiki

**Process:**
```
1. Save to correct location
   └─ Reference WIKI_STRUCTURE_MKDOCS.mdc for path
   └─ Service docs → docs/services/[service-name]/
   └─ Feature docs → docs/features/[feature-name]/
   └─ Workflow docs → docs/workflows/
   └─ Operations docs → docs/operations/[category]/
   └─ Reference docs → docs/reference/[category]/
   └─ Templates → docs/reference/templates/

2. Update wiki navigation
   ├─ For Quartz: Update `quartz.config.ts` navigation (if using Quartz)
   ├─ For MkDocs: Update `mkdocs.yml` navigation (if using MkDocs)
   ├─ Follow existing structure
   └─ Keep alphabetically sorted

3. Update search index
   ├─ Quartz/MkDocs auto-indexes on build
   └─ Verify new doc appears in search

4. Log in Memory Bank
   └─ log_decision(type="DOCUMENTATION_CREATED")
   └─ Track documentation location in custom_data

5. Notify user
   ├─ "Created: [doc path]"
   ├─ "Updated wiki navigation"
   └─ "Ready for preview"
```

**Validation:**
```bash
# Validate markdown syntax
markdownlint docs/path/to/file.md

# Check links (manual check or automated link checker)
# Test Mermaid diagrams (render in wiki preview)
```

---

## Documentation Generation Checklist

### BEFORE GENERATION

```
BEFORE GENERATION:
- [ ] Identify content type (use DOCUMENTATION_CONTENT_TYPES.mdc)
- [ ] **Select appropriate template** (use documentation-templates.mdc) - **PRIMARY SOURCE**
- [ ] Check if docs already exist in Memory Bank (semantic search)
- [ ] Check if docs already exist in wiki (search docs/ directory)
- [ ] Identify all related services/features (dependency mapping)
- [ ] Gather: architecture diagram (if needed), API spec, code references
- [ ] Set correct location (use WIKI_STRUCTURE_MKDOCS.mdc)
- [ ] **Follow template naming conventions** (template shows title format)
- [ ] Determine if updating existing or creating new (see decision tree below)

⚠️ ENFORCEMENT CHECKS (MANDATORY - BLOCKS CREATION IF FAILED):
- [ ] Check if doc type requires template (see DOCUMENTATION_CONTENT_TYPES.mdc)
- [ ] Verify template exists in docs/reference/templates/
- [ ] Verify location is correct per WIKI_STRUCTURE_MKDOCS.mdc
- [ ] Verify Memory Bank links planned (if applicable - see DOCUMENTATION_CONTENT_TYPES.mdc)
- [ ] Run pre-creation validation: bash scripts/validate-documentation-creation.sh [file-path]
```

### DURING GENERATION

```
DURING GENERATION:
- [ ] **Use template exactly** (see documentation-templates.mdc) - **PRIMARY SOURCE**
- [ ] **Follow template's title format** (template shows naming convention)
- [ ] Include all required sections from template
- [ ] Generate diagrams if applicable (Mermaid format - see DIAGRAM_GENERATION_RULES.mdc)
- [ ] Add cross-references to related docs (see DOCUMENTATION_CROSS_REFERENCE_RULES.mdc)
- [ ] Add version info (service version, doc version, date created)
- [ ] Add "last updated" timestamp
- [ ] Link back to source code (GitHub links where applicable)
- [ ] Include Memory Bank decision link (if architectural decision)
- [ ] **Use template's YAML front matter format** (template shows exact format)
- [ ] Add keywords and tags for searchability (template shows examples)
```

### AFTER GENERATION

```
AFTER GENERATION:
- [ ] **Pass quality checklist** (see CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc)
- [ ] **Run post-creation validation: bash scripts/validate-documentation-compliance.sh [file-path]**
- [ ] Validate markdown syntax
- [ ] Check all links work (relative paths)
- [ ] Test Mermaid diagrams render
- [ ] Check code examples are correct
- [ ] Verify file location per WIKI_STRUCTURE_MKDOCS.mdc
- [ ] Verify template compliance (all required sections present)
- [ ] Verify YAML front matter complete (all required fields)
- [ ] Verify Memory Bank links valid (if applicable)
- [ ] Update wiki navigation if needed (Quartz config or mkdocs.yml)
- [ ] Update search index (Quartz/MkDocs auto-indexes)
- [ ] Log in Memory Bank: documentation_created decision
- [ ] Notify user of completion
```

---

## When to Create New vs Update Existing

**Decision Tree:**

1. **Is the content for a completely new service or feature?** → **CREATE NEW**
2. **Does the content represent a new *type* of documentation for an existing service/feature?** (e.g., first `api-reference.md`) → **CREATE NEW**
3. **Is the content a significant, distinct topic that would make an existing document too long or unfocused?** → **CREATE NEW**
4. **Otherwise?** → **UPDATE EXISTING**

**See:** `DOCUMENTATION_NAMING_STANDARDS.mdc` for detailed guidance on create vs update decisions.

---

## Documentation Update Workflow

**When to Update:**
- Code changes significantly
- Configuration changes
- API changes
- User reports outdated information
- Scheduled review date reached (see DOCUMENTATION_FRESHNESS_PROTOCOL.mdc)

**Update Process:**
```
1. Load existing doc
   ├─ Find document file
   ├─ Read current version
   └─ Note current last_updated date

2. Identify what changed
   ├─ Code changed?
   ├─ Configuration changed?
   ├─ Dependencies changed?
   ├─ Architecture changed?
   └─ User feedback?

3. Update relevant sections
   ├─ Edit specific sections that changed
   ├─ Don't rewrite entire document
   ├─ Preserve original author notes
   └─ Keep structure consistent

4. Update metadata
   ├─ Update last_updated to today
   ├─ Update status if needed
   ├─ Update next_review_date
   └─ Note change reason in comments

5. Validate and log
   ├─ **Pass quality checklist** (see CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc)
   ├─ Check all links still work
   ├─ Verify diagrams still accurate
   ├─ Log update in Memory Bank
   └─ Update modification timestamp

6. Notify
   ├─ "Updated: [doc path]"
   ├─ "Sections changed: [list]"
   └─ "Last updated: [date]"
```

---

## Quality Gates

**CRITICAL:** All documentation must pass the quality checklist before being committed.

**See:** `CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc` for the complete, authoritative quality checklist.

**Quick Reference:**
- Content Quality: Template compliance, accuracy, completeness
- Format Quality: Markdown syntax, YAML front matter, links, diagrams
- Integration Quality: Cross-references, wiki navigation, Memory Bank logging
- Technical Quality: Code examples tested, diagrams render, version accuracy

---

## Integration with SERVICE_LAUNCH_CHECKLIST

**PHASE 8: Documentation (from `add-new-service.mdc`)**

When creating a new service, documentation MUST be generated:

```yaml
PHASE 8: Documentation
  - [ ] Service overview.md created (location: docs/services/[service]/overview.md)
  - [ ] Troubleshooting.md created (location: docs/services/[service]/troubleshooting.md)
  - [ ] Metrics.md created (location: docs/services/[service]/metrics.md)
  - [ ] Configuration.md created (location: docs/services/[service]/configuration.md)
  - [ ] Diagrams created (location: docs/services/[service]/diagrams.md)
  - [ ] All docs follow templates (documentation-templates.mdc)
  - [ ] All docs include YAML front matter
  - [ ] All docs pass quality checklist (CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc)
  - [ ] Wiki navigation updated (Quartz config or mkdocs.yml)
  - [ ] Cross-references added
  - [ ] Memory Bank documentation_created logged
```

---

## Integration with Memory Bank

**Documentation Creation:**
```python
# When documentation is created
log_decision(
    workspace_id="${DATA_ROOT}/platform",
    summary=f"Documentation created: {doc_title}",
    rationale=f"Documentation for {component_name}. Type: {content_type}",
    implementation_details=f"Location: {doc_path}. Template: {template_name}",
    tags=["documentation", "documentation_created", component_type]
)

# Track documentation location
log_custom_data(
    workspace_id="${DATA_ROOT}/platform",
    category="documentation",
    key=component_name,
    value={
        "doc_path": doc_path,
        "doc_type": content_type,
        "last_updated": datetime.now().isoformat(),
        "status": "current"
    }
)
```

**Documentation Update:**
```python
# When documentation is updated
log_decision(
    workspace_id="${DATA_ROOT}/platform",
    summary=f"Documentation updated: {doc_title}",
    rationale=f"Updated to reflect {change_type}. Sections: {sections}",
    tags=["documentation", "documentation_updated"]
)
```

**Memory Bank Tracks Documentation State:**
```python
# Track documentation status
log_custom_data(
    workspace_id="${DATA_ROOT}/platform",
    category="documentation_status",
    key="overall",
    value={
        "documentation_status": "complete|incomplete|outdated",
        "missing_documentation": ["service-x-api", "workflow-y-diagram"],
        "outdated_documentation": ["service-a-overview (last updated 2025-10)"],
        "next_documentation_audit": "2026-03-21"
    }
)
```

---

## Error Handling

**If Documentation Generation Fails:**
1. Log error in Memory Bank
2. Report to user what failed
3. Suggest manual documentation creation
4. Provide template for user to fill

**If Documentation Update Fails:**
1. Preserve original documentation
2. Log what couldn't be updated
3. Report to user
4. Suggest manual update

---

## Related Documentation

**Core References:**
- [Documentation Templates](./documentation-templates.mdc) - **PRIMARY SOURCE** for templates
- [Documentation Content Types](./DOCUMENTATION_CONTENT_TYPES.mdc) - Type definitions
- [Documentation Quality Checklist](./CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc) - **AUTHORITATIVE** quality gates
- [Wiki Structure](./WIKI_STRUCTURE_MKDOCS.mdc) - File locations and organization
- [Documentation Naming Standards](./DOCUMENTATION_NAMING_STANDARDS.mdc) - Naming conventions (adhoc docs)

**Supporting References:**
- [Documentation Cross-Reference Rules](./DOCUMENTATION_CROSS_REFERENCE_RULES.mdc) - Cross-reference format
- [Diagram Generation Rules](./DIAGRAM_GENERATION_RULES.mdc) - Diagram templates
- [Documentation Freshness Protocol](./DOCUMENTATION_FRESHNESS_PROTOCOL.mdc) - Review scheduling
- [Documentation Requirements Guide](./DOCUMENTATION_REQUIREMENTS_GUIDE.mdc) - Complete requirements by phase gate
- [Documentation Governance Summary](./DOCUMENTATION_GOVERNANCE_SUMMARY.mdc) - Quick reference/index
