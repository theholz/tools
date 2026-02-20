# Development Phases

**Version:** 1.0.0  
**Last Updated:** 2026-01-06

## Overview

The framework follows a structured 5-phase development process: **ARCHITECT → PLAN → QA → ACT → REVIEW**. Each phase has specific objectives, deliverables, and blocking conditions.

## Phase 1: ARCHITECT

### Objective
Define and enforce the technical foundation for the feature or service.

### Mandatory Checklist

1. **Load Product Context**
   - Read vision, goals, constraints
   - Understand non-negotiables
   - Identify success criteria

2. **Feasibility Analysis**
   - Technical feasibility
   - Version compatibility
   - Alternative solutions
   - Risk assessment

3. **Define Critical Rules**
   - What must never be violated
   - Security requirements
   - Performance requirements
   - Compliance requirements

4. **Create Epic**
   - Clear description
   - Acceptance criteria
   - Success metrics
   - Dependencies

5. **Log Decision**
   - Log feasibility decision to Memory Bank
   - Document rationale
   - Track confidence level

### Biswas Pattern: Reflection

- Generate feasibility assessment
- Evaluate quality (risk, alternatives, constraints)
- Refine if quality < 0.75 (max 3 iterations)
- Log decision to Memory Bank

### Blocking Conditions

Cannot proceed to PLAN without:
- ✓ Epic created with acceptance criteria
- ✓ Feasibility decision logged
- ✓ Version constraints documented
- ✓ Critical rules defined

### Deliverables

- Epic document
- Feasibility analysis
- Technical requirements
- Risk assessment
- Architecture diagram (if applicable)

---

## Phase 2: PLAN

### Objective
Create a detailed implementation plan with CMDB integration.

### Mandatory Checklist

**Step 0: Load Task Context**
- Call: `scripts/enforcement/get-task-context.sh PLAN [task-type]`
- Review: Templates and rules shown for current task
- Use: Templates and rules are now FRONT AND CENTER

**Task Types:**
- `service-creation` - Creating new service
- `feature-creation` - Creating new feature
- `cmdb-update` - Updating CMDB
- `documentation` - Creating documentation

**1. CMDB QUERY (REQUIRED - will block if skipped)**
```bash
Command: scripts/query-service-dependencies-enhanced.sh [service] all
Record: What services depend on this?
Log to Memory Bank: cmdb_queried: true, dependencies: [list]

If skipped: BLOCKER will be raised
OPA Policy: opa/policies/plan-cmdb-enforcement.rego
```

**2. Template Selection**
- Use templates shown by get-task-context.sh
- List exact documentation you will create
- Specify diagram types (architecture, flow, dependency)
- Specify folder structure

**3. Break into Stories**
- Each story has acceptance criteria
- Each story is testable and measurable
- Stories linked to epic (IMPLEMENTS relationship)

**4. Map Dependencies**
- Document BLOCKEDBY relationships
- Identify what must happen first
- Update CMDB if needed

**5. Run OPA Plan Policies**
```bash
opa eval --data opa/policies/plan-cmdb-enforcement.rego \
         --input <(echo '{"memory-bank_data": {"cmdb_queried": true}}')
```

### Biswas Pattern: Planning

- Decompose complex goals into sequential subtasks
- Validate dependencies before execution
- Handle failures gracefully
- Log plan to Memory Bank

### Blocking Conditions

- If CMDB not queried → Cannot proceed
- If templates not specified → Cannot proceed
- If OPA policies fail → Cannot proceed

### Deliverables

- Implementation plan
- User stories with acceptance criteria
- Dependency map
- CMDB update (if needed)
- Documentation plan

---

## Phase 3: QA VALIDATION

### Objective
Validate that all prerequisites are met before implementation.

### CRITICAL
This phase cannot be skipped. It is a mandatory gate before ACT.

### Mandatory 4-Point Validation

**1. Dependency Verification**
- All required packages installed?
- Versions compatible?
- Install missing packages if needed

**2. Configuration Validation**
- YAML/JSON syntax valid?
- Platform compatible?
- Required settings present?

**3. Environment Validation**
- Build tools available? (Docker, npm, pip, etc.)
- Permissions sufficient?
- Ports available?

**4. Minimal Build Test**
- Create minimal test structure
- Attempt build/compile
- Run basic functionality test

### Log Results

```bash
Update Memory Bank: qa_validation_status: "PASS" or "FAIL"
If FAIL: Show exact failures + how to fix
```

### Blocking Condition

```
CANNOT proceed to ACT if qa_validation_status != "PASS"
This is a hard block. You cannot override it.
OPA Policy: opa/policies/qa-validation-enforcement.rego
```

### Deliverables

- QA validation report
- Dependency installation log
- Configuration validation results
- Build test results

---

## Phase 4: ACT

### Objective
Implement the feature or service following all rules and patterns.

### Mandatory Checklist

**Step 0: Load Task Context**
```bash
Call: scripts/enforcement/get-task-context.sh ACT [task-type]
Review: Templates and rules shown for implementation
Use: Templates and rules are now FRONT AND CENTER
```

**1. Search Before Code**
```bash
Call: semantic_search_memory-bank("what you're building")
Log result: "Found X existing implementations" or "No existing found"

If found: Show what you found + how you'll reuse/adapt
If not found: Justify why creating new
```

**2. Choose Tools Using Priority (MUST follow)**
```
Priority order (shown in task context):
1. n8n workflows (can this be a workflow?)
2. MCP tools (specialized tools available?)
3. Cursor MCP (file operations, search, memory?)
4. Custom code (only if nothing above works)

Justify your tool choice against this priority.
```

**3. Implement Code**
- Follow system-patterns.mdc
- Use templates where applicable
- Write tests
- Update progress

**4. Log All Actions (Automatic)**
```bash
Use: scripts/enforcement/enhanced_action_logging.py
Automatically logs:
- All tool calls (with duration, success/failure)
- All decisions (with rationale)
- Real-time progress updates (with phase/story/status)
```

**5. Pre-Commit Validation**
- OPA policies pass?
- YAML valid?
- Documentation templates used?
- If failures: Fix before commit

### Biswas Pattern: Tool Use

- Every tool: schema, validation, error handling, fallback
- Log every tool call (request + response + latency)
- Use cached data if tool fails
- Log fallback usage to Memory Bank

### Doctrine P3: Express Uncertainty

- Every decision includes confidence score (0-1)
- Escalate if confidence < 0.60
- Log confidence to Memory Bank

### Deliverables

- Implemented code
- Unit tests
- Integration tests
- Documentation
- Action logs

---

## Phase 5: REVIEW

### Objective
Verify implementation meets all acceptance criteria and request approval.

### Mandatory Checklist

**Step 0: Load Task Context**
```bash
Call: scripts/enforcement/get-task-context.sh REVIEW [task-type]
Review: Templates and rules shown for review
Use: Templates and rules are now FRONT AND CENTER
```

**1. Verify Acceptance Criteria**
- Each AC is testable?
- Each AC is measurable?
- Each AC is verified?
- Log verification results

**2. Check Tests and Quality**
- All tests pass?
- No regressions?
- Code review checklist complete?

**3. Verify Documentation**
- Documentation complete?
- From correct templates?
- All links work?
- Diagrams render?
- Updated mkdocs.yml?

**4. Check Error Pattern Prevention**
- Does this epic touch any of 13 error patterns?
- Are prevention rules applied?

**5. Request User Approval**
- Documentation is complete
- Tests all pass
- All AC verified
- **WAIT for human user approval before marking DONE**
- User must explicitly approve

**6. Check if Retrospective Needed**
- After 3-5 completed epics? → Trigger retrospective
- After process violations? → Trigger retrospective

### Biswas Pattern: Metacognition

- Every decision includes confidence score (0-1)
- Escalate if confidence < 0.60
- Log confidence to Memory Bank
- Track calibration over time

### Blocking Conditions

Cannot mark DONE without:
- ✓ All AC verified and logged
- ✓ All tests passing
- ✓ Documentation complete
- ✓ Checklist verified (OPA: opa/policies/review-checklist-enforcement.rego)
- ✓ User approval (HUMAN ONLY)

### Deliverables

- Verification report
- Test results
- Documentation review
- User approval
- Retrospective (if needed)

---

## Phase Transitions

### ARCHITECT → PLAN
- Epic created
- Feasibility approved
- Critical rules defined

### PLAN → QA
- CMDB queried
- Implementation plan complete
- Dependencies mapped

### QA → ACT
- All dependencies verified
- Configuration validated
- Build test passed

### ACT → REVIEW
- Implementation complete
- Tests passing
- Documentation complete

### REVIEW → DONE
- All AC verified
- User approval received
- Retrospective completed (if needed)

---

## Error Handling

### Phase Blockers

If a phase is blocked:
1. Log blocker to Memory Bank
2. Identify root cause
3. Present options to user
4. Wait for resolution

### Phase Failures

If a phase fails:
1. Log failure with full context
2. Attempt recovery
3. If unrecoverable, escalate to human
4. Continue with other phases if possible

### Rollback

If implementation fails:
1. Rollback changes
2. Log rollback to Memory Bank
3. Analyze root cause
4. Update prevention rules

---

## Best Practices

### Always
- Follow phase order strictly
- Complete all checklist items
- Log all decisions and actions
- Express uncertainty when appropriate
- Use templates and patterns

### Never
- Skip phases
- Override blocking conditions
- Proceed without user approval (in REVIEW)
- Assume without verification
- Ignore CMDB queries

### When in Doubt
- Escalate to human
- Log uncertainty
- Request clarification
- Use conservative approach

---

## References

- [Biswas Patterns](biswas-patterns.md)
- [Doctrine Principles](doctrine-principles.md)
- [Decision Making](decision-making.md)
- [System Patterns](../rules/system-patterns.md)