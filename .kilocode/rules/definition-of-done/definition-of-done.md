---
name: definition-of-done
description: 'Cursor rule: definition-of-done. Use when following project rules for this topic.'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/DEFINITION_OF_DONE.mdc"
---

# Definition of Done - Features and Services

## Overview

**CRITICAL:** This document defines the complete checklist of requirements that must be met before any feature or service is considered **done** and **production-ready**.

**Location:** Stored in Memory Bank `custom_data` (category: `critical_settings`, key: `definition_of_done`)

## Phase Gates (Must Pass All)

### 1️⃣ ARCHITECT Phase

**Required:**
- [ ] Product context loaded in Memory Bank
- [ ] Feasibility decision logged with tag `feasibilityanalysis`
- [ ] Epic created with acceptance criteria
- [ ] Epic linked to milestone (TRACKS relationship)

**Gate:** Gate 1: Before Epic Creation - ProductContext + feasibility decision

---

### 2️⃣ PLAN Phase

**Required:**
- [ ] Story selected with acceptance criteria
- [ ] All blocking stories resolved (status='done' OR acknowledged as blocked)
- [ ] Version constraints from feasibility decision retrieved
- [ ] Story status=active (user confirmed)

**Gates:**
- Gate 2: Before Story Selection - current_epic set, blocking stories resolved
- Gate 3: Before Task Assignment - story with acceptance criteria, version constraints

---

### 3️⃣ QA VALIDATION Phase (MANDATORY)

**CRITICAL:** Cannot proceed to ACT mode without `qa_validation_status: "PASS"`

**Required:**
- [ ] **Dependency Verification** - All packages installed and compatible
- [ ] **Configuration Validation** - All config files valid and platform-compatible
- [ ] **Environment Validation** - Build tools available, permissions sufficient
- [ ] **Minimal Build Test** - Build process successful, basic functionality works

**Gate:** Gate 4: Before Implementation - QA Validation PASS status required

**Status Tracking:** `qa_validation_status: "PASS" | "FAIL" | "PENDING"` in Memory Bank activeContext

**Reference:** See `qa-validation-pattern.mdc` for complete validation process

---

### 4️⃣ ACT Phase (Implementation)

**Required:**
- [ ] All acceptance criteria met
- [ ] Code follows system-patterns.mdc
- [ ] Tests pass (unit, integration, regression)
- [ ] No regression in existing functionality
- [ ] Documentation updated to match code
- [ ] Memory Bank progress updated throughout

**Gate:** Cannot proceed without QA Validation PASS

**Acceptance Criteria Validation:**
- [ ] Each AC is testable (can be verified)
- [ ] Each AC is measurable (has success criteria)
- [ ] Each AC maps to at least one DoD requirement
- [ ] Each AC has been validated (tested/verified)
- [ ] AC validation results are documented
- [ ] AC validation is logged in Memory Bank

**Code Quality Requirements:**
- [ ] MCP tool prioritization followed (n8n > MCP > custom code)
- [ ] Semantic search performed before coding (`semantic_search_memory-bank`)
- [ ] Existing patterns reused when possible
- [ ] No code duplication
- [ ] No deprecated patterns used

---

### 5️⃣ REVIEW Phase

**Required:**
- [ ] Documentation matches code reality
- [ ] Full test suite passes
- [ ] Retrospective logged (if significant learnings)
- [ ] **User approval (HUMAN ONLY - agents cannot mark this)**
- [ ] Memory Bank active context updated

**Gate:** User approval required for final sign-off

**User Approval (CRITICAL):**
- ⚠️ **Final verification is HUMAN ONLY**
- ⚠️ User must approve "tested and verified working"
- ⚠️ Agents CANNOT mark user approval as complete
- ✅ Agents CAN: Run automated tests, verify other ACs, take screenshots, document results, move card to "Your Queue" for sign-off

---

## Documentation Requirements

**Required:**
- [ ] Service/feature documentation created per `DOCUMENTATION_CONTENT_TYPES.mdc`
- [ ] All required sections present for content type
- [ ] YAML front matter complete:
  - `title`, `last_updated`, `status`, `next_review_date`
  - `keywords`, `tags`, `review_frequency`
- [ ] Cross-references added per `DOCUMENTATION_CROSS_REFERENCE_RULES.mdc`
- [ ] Diagrams generated per `DIAGRAM_GENERATION_RULES.mdc` (if applicable)
- [ ] Wiki navigation updated (Quartz config or mkdocs.yml depending on system)
- [ ] Quality checklist passed per `CURSOR_DOCUMENTATION_QUALITY_CHECKLIST.mdc`

**Location:** `docs/services/[service-name]/` or `docs/features/[feature-name]/`

---

## Testing Requirements

**Required:**
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Regression tests pass (no existing functionality broken)
- [ ] Health checks configured and passing
- [ ] Manual testing completed (user approval)

**Test Types:**
- Unit tests
- Integration tests
- Regression tests
- Health check tests
- Manual user testing

---

## Monitoring Requirements

**Required:**
- [ ] Prometheus metrics endpoint configured (if applicable)
- [ ] Prometheus scrape config added
- [ ] Grafana dashboard created (if applicable)
- [ ] Logging configured
- [ ] Alert rules defined (if applicable)
- [ ] Health check endpoint functional

**Optional:**
- Custom metrics tracked
- Performance baselines established

---

## Docker Integration Requirements

**Required:**
- [ ] Dockerfile created (if new service)
- [ ] Service added to `docker compose.yml` with profile
- [ ] **No port publishing** (Caddy handles routing)
- [ ] Volume mounts configured correctly
- [ ] Environment variables documented
- [ ] Health check configured
- [ ] Dependencies set up (`depends_on` with `condition: service_healthy`)

**Optional:**
- Caddy routing configured (if external access needed)
- Basic auth configured (if needed)

**Reference:** See `system-patterns.mdc` for Docker service patterns

---

## Memory Bank Tracking Requirements

**Required:**
- [ ] Epic created in Memory Bank (`custom_data` category: `roadmap`)
- [ ] Stories created as progress entries
- [ ] Decisions logged for architectural choices
- [ ] Progress updated throughout implementation
- [ ] Active context updated with status

**Relationships:**
- [ ] Epic linked to milestone (TRACKS relationship)
- [ ] Stories linked to epic (IMPLEMENTS relationship)
- [ ] Decisions linked to epic (CLARIFIES relationship)

---

## Quick Reference Checklist

**Before marking ANY feature/service as DONE:**

```
✅ PHASE GATES:
  [ ] ARCHITECT: Product context, feasibility, epic created
  [ ] PLAN: Story selected, blocking stories resolved
  [ ] QA VALIDATION: All 4 points passed, status=PASS in Memory Bank
  [ ] ACT: All ACs met, tests pass, code follows patterns
  [ ] REVIEW: Docs match code, user approval obtained

✅ DOCUMENTATION:
  [ ] Service/feature docs created
  [ ] YAML front matter complete
  [ ] Cross-references added
  [ ] Diagrams generated (if needed)
  [ ] Wiki navigation updated (Quartz config or mkdocs.yml)
  [ ] Quality checklist passed

✅ TESTING:
  [ ] Unit tests passing
  [ ] Integration tests passing
  [ ] Regression tests passing
  [ ] Health checks passing
  [ ] Manual testing (user approved)

✅ MONITORING:
  [ ] Prometheus metrics configured
  [ ] Grafana dashboard created
  [ ] Logging configured
  [ ] Health check functional

✅ DOCKER:
  [ ] Service in docker compose.yml with profile
  [ ] No port publishing
  [ ] Volume mounts configured
  [ ] Health check configured
  [ ] Dependencies set up

✅ MEMORY_BANK:
  [ ] Epic created
  [ ] Stories as progress entries
  [ ] Decisions logged
  [ ] Progress updated
  [ ] Relationships created

✅ CODE QUALITY:
  [ ] Follows system-patterns.mdc
  [ ] MCP tool prioritization followed
  [ ] Semantic search performed
  [ ] Existing patterns reused

✅ USER APPROVAL:
  [ ] User approved "tested and verified working"
  [ ] User signed off
  [ ] Ready for production
```

---

## Enforcement

**CRITICAL:** This definition of done is **mandatory** and **non-negotiable**.

- **No feature/service can be marked DONE without passing all phase gates**
- **QA Validation is MANDATORY** - cannot proceed to ACT without PASS status
- **User approval is MANDATORY** - agents cannot mark user approval as complete
- **All requirements must be verified** before production deployment

**Violations:**
- Features marked DONE without passing gates → Revert to appropriate phase
- Code merged without QA Validation → Block merge, require validation
- User approval bypassed → Block deployment, require user sign-off

---

## Integration with Memory Bank

**Definition of Done is stored in:**
- Memory Bank `custom_data` (category: `critical_settings`, key: `definition_of_done`)
- This document (`.cursor/rules/DEFINITION_OF_DONE.mdc`)

**Verification:**
```python
# Get Definition of Done from Memory Bank
definition = get_custom_data(
    workspace_id="${DATA_ROOT}/platform",
    category="critical_settings",
    key="definition_of_done"
)
```

---

## References

- **QA Validation:** `.cursor/rules/qa-validation-pattern.mdc`
- **Documentation Governance:** `.cursor/rules/DOCUMENTATION_CONTENT_TYPES.mdc`
- **System Patterns:** `.cursor/rules/system-patterns.mdc`
- **Memory Bank Strategy:** `.cursor/rules/memory-bank-cursor-strategy.mdc`
- **MCP Tool Prioritization:** `.cursor/rules/MCP_TOOL_PRIORITIZATION.mdc`

---

**Last Updated:** 2025-12-22  
**Version:** 1.0  
**Status:** Active
