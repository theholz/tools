---
name: qa-validation-pattern
description: 'Cursor rule: qa-validation-pattern. Use when following project rules for this topic.'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/qa-validation-pattern.mdc"
---

# QA Validation Pattern - Pre-Implementation Gate

## Overview

**CRITICAL:** Before ANY code implementation, ALL services and features MUST pass a 4-point technical validation. This validation acts as a mandatory gate before proceeding to implementation (ACT mode in Memory Bank).

## Integration with Memory Bank Vision-First Strategy

This QA validation integrates with Memory Bank's workflow:

```
ARCHITECT → PLAN → WEEKLY_SYNC → QA VALIDATION → ACT
```

**Gate Position:** QA Validation occurs AFTER planning/design phases and BEFORE implementation.

**Enforcement:**
- Memory Bank `activeContext` tracks `qa_validation_status`
- Cannot proceed to ACT mode without `qa_validation_status: "PASS"`
- If validation fails, update `activeContext.status: "BLOCKED"` and log blocker

## 4-Point Validation Process

### 1️⃣ Dependency Verification

**Purpose:** Verify all required packages, libraries, and tools are installed and compatible.

**Process:**
```bash
# 1. Read required dependencies from design/planning phase
# 2. Check if dependencies are installed
# 3. Verify versions and compatibility
# 4. Install missing dependencies if needed
# 5. Verify installation success
```

**Validation Checklist:**
- [ ] All required packages identified from design phase
- [ ] Package versions checked for compatibility
- [ ] Missing packages installed
- [ ] Version conflicts resolved
- [ ] Dependencies verified with import/version checks

**Example (Python):**
```bash
# Check Python version
python3 --version  # Should match requirements

# Check required packages
python3 -c "import package_name; print(package_name.__version__)"

# Install missing packages
pip install -r requirements.txt

# Verify installation
pip list | grep package_name
```

**Example (Node.js):**
```bash
# Check Node.js version
node --version  # Should match requirements

# Check required packages
npm list package-name

# Install missing packages
npm install

# Verify installation
npm list --depth=0
```

**Failure Handling:**
- If dependencies cannot be installed: Log blocker, stop process
- If version conflicts: Document conflict, propose resolution options
- If compatibility issues: Update design or find alternative

### 2️⃣ Configuration Validation

**Purpose:** Validate configuration files format, syntax, and platform compatibility.

**Process:**
```bash
# 1. Identify all configuration files
# 2. Validate syntax (JSON, YAML, etc.)
# 3. Check platform compatibility
# 4. Verify required settings present
# 5. Fix syntax errors if found
```

**Validation Checklist:**
- [ ] All configuration files identified
- [ ] JSON/YAML syntax validated
- [ ] Platform-specific settings verified
- [ ] Required environment variables documented
- [ ] Configuration format compatible with target platform

**Example (JSON):**
```bash
# Validate JSON syntax
python3 -m json.tool config.json > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ JSON syntax error in config.json"
    exit 1
fi
```

**Example (YAML):**
```bash
# Validate YAML syntax (if yq available)
yq eval . docker compose.yml > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ YAML syntax error in docker compose.yml"
    exit 1
fi
```

**Example (Docker Compose):**
```bash
# Validate docker compose.yml
docker compose -p localai config > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ docker compose.yml validation failed"
    exit 1
fi
```

**Failure Handling:**
- If syntax errors: Fix immediately, re-validate
- If missing required settings: Document missing settings, stop process
- If platform incompatibility: Adapt configuration, re-validate

### 3️⃣ Environment Validation

**Purpose:** Verify build environment is properly set up with required tools and permissions.

**Process:**
```bash
# 1. Check build tools availability
# 2. Verify permissions (read/write access)
# 3. Check port availability (if needed)
# 4. Verify network connectivity (if needed)
# 5. Check disk space (if needed)
```

**Validation Checklist:**
- [ ] Required build tools available (git, node, python, docker, etc.)
- [ ] Write permissions in project directory
- [ ] Required ports available (if service needs ports)
- [ ] Network connectivity verified (if external APIs needed)
- [ ] Sufficient disk space available

**Example:**
```bash
# Check build tools
required_tools=("git" "node" "npm" "docker")
missing_tools=()

for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        missing_tools+=("$tool")
    fi
done

if [ ${#missing_tools[@]} -gt 0 ]; then
    echo "❌ Missing tools: ${missing_tools[*]}"
    exit 1
fi

# Check write permissions
if [ ! -w "." ]; then
    echo "❌ No write permission in current directory"
    exit 1
fi

# Check port availability (example: port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3000 already in use"
    # Optionally: exit 1 if port is critical
fi
```

**Failure Handling:**
- If tools missing: Install tools or document requirement
- If permissions insufficient: Request permissions or change directory
- If ports unavailable: Change port or stop conflicting service

### 4️⃣ Minimal Build Test

**Purpose:** Perform minimal build test to ensure core functionality works before full implementation.

**Process:**
```bash
# 1. Create minimal test project/structure
# 2. Attempt build/compilation
# 3. Run basic functionality test
# 4. Verify core features work
# 5. Clean up test artifacts
```

**Validation Checklist:**
- [ ] Minimal test structure created
- [ ] Build process successful
- [ ] Basic functionality test passed
- [ ] Core features verified
- [ ] Test artifacts cleaned up

**Example (Node.js/React):**
```bash
# Create minimal test
mkdir -p .__build_test
cd .__build_test

# Initialize minimal package.json
cat > package.json << EOF
{
  "name": "build-test",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Build test successful'"
  }
}
EOF

# Test build
npm run build

# Cleanup
cd ..
rm -rf .__build_test
```

**Example (Python):**
```bash
# Create minimal test
mkdir -p .__build_test
cd .__build_test

# Create minimal test file
cat > test.py << EOF
def test_function():
    return "Test successful"

if __name__ == "__main__":
    print(test_function())
EOF

# Test execution
python3 test.py

# Cleanup
cd ..
rm -rf .__build_test
```

**Example (Docker):**
```bash
# Test Docker build
docker compose -p localai config > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Docker Compose configuration valid"
else
    echo "❌ Docker Compose configuration invalid"
    exit 1
fi
```

**Failure Handling:**
- If build fails: Fix build issues, re-test
- If functionality test fails: Investigate root cause, fix or redesign
- If core features don't work: Revisit design phase

## QA Validation Report Format

After running all validation steps, generate a comprehensive report:

```
╔═════════════════════ 🔍 QA VALIDATION REPORT ══════════════════════╗
│                                                                     │
│  PROJECT: [Project Name]                                            │
│  TIMESTAMP: [Current Date/Time]                                     │
│  SERVICE/FEATURE: [Service or Feature Name]                        │
│                                                                     │
│  1️⃣ DEPENDENCY VERIFICATION                                         │
│  ✓ Required: [List of required dependencies]                        │
│  ✓ Installed: [List of installed dependencies]                      │
│  ✓ Compatible: [Yes/No]                                            │
│  ✓ Status: [PASS/FAIL]                                             │
│                                                                     │
│  2️⃣ CONFIGURATION VALIDATION                                        │
│  ✓ Config Files: [List of configuration files]                      │
│  ✓ Syntax Valid: [Yes/No]                                          │
│  ✓ Platform Compatible: [Yes/No]                                   │
│  ✓ Status: [PASS/FAIL]                                             │
│                                                                     │
│  3️⃣ ENVIRONMENT VALIDATION                                          │
│  ✓ Build Tools: [Available/Missing]                                │
│  ✓ Permissions: [Sufficient/Insufficient]                          │
│  ✓ Environment Ready: [Yes/No]                                     │
│  ✓ Status: [PASS/FAIL]                                             │
│                                                                     │
│  4️⃣ MINIMAL BUILD TEST                                              │
│  ✓ Build Process: [Successful/Failed]                              │
│  ✓ Functionality Test: [Passed/Failed]                             │
│  ✓ Build Ready: [Yes/No]                                           │
│  ✓ Status: [PASS/FAIL]                                             │
│                                                                     │
│  🚨 FINAL VERDICT: [PASS/FAIL]                                      │
│  ➡️ [Success message or error details]                              │
╚═════════════════════════════════════════════════════════════════════╝
```

## Failure Report Format

If any validation step fails:

```
⚠️⚠️⚠️ QA VALIDATION FAILED ⚠️⚠️⚠️

The following issues must be resolved before proceeding to implementation:

1️⃣ DEPENDENCY ISSUES:
- [Detailed description of dependency issues]
- [Recommended fix]
- [Action required]

2️⃣ CONFIGURATION ISSUES:
- [Detailed description of configuration issues]
- [Recommended fix]
- [Action required]

3️⃣ ENVIRONMENT ISSUES:
- [Detailed description of environment issues]
- [Recommended fix]
- [Action required]

4️⃣ BUILD TEST ISSUES:
- [Detailed description of build test issues]
- [Recommended fix]
- [Action required]

⚠️ IMPLEMENTATION IS BLOCKED until these issues are resolved.
```

## Integration with Memory Bank

**When QA Validation Passes:**
```python
# Update Memory Bank active context
update_active_context(
    workspace_id="${DATA_ROOT}/platform",
    patch_content={
        "qa_validation_status": "PASS",
        "qa_validation_timestamp": "2025-12-21T12:00:00Z",
        "can_advance_to_act": True
    }
)

# Log decision
log_decision(
    workspace_id="${DATA_ROOT}/platform",
    summary="QA Validation Passed - Ready for Implementation",
    rationale="All 4 validation points passed: dependencies verified, configuration valid, environment ready, build test successful",
    tags=["qa_validation", "pre_implementation"]
)
```

**When QA Validation Fails:**
```python
# Update Memory Bank active context
update_active_context(
    workspace_id="${DATA_ROOT}/platform",
    patch_content={
        "qa_validation_status": "FAIL",
        "qa_validation_timestamp": "2025-12-21T12:00:00Z",
        "can_advance_to_act": False,
        "status": "BLOCKED",
        "active_blockers": ["QA Validation failed: [specific issues]"]
    }
)

# Log blocker decision
log_decision(
    workspace_id="${DATA_ROOT}/platform",
    summary="QA Validation Failed - Implementation Blocked",
    rationale="QA validation failed: [list specific failures]. Must resolve before proceeding to implementation.",
    tags=["qa_validation", "blocker", "pre_implementation"]
)
```

## When to Run QA Validation

**Mandatory Triggers:**
1. **Before new service implementation** - After PLAN phase, before ACT phase
2. **Before major feature implementation** - After design decisions made
3. **After dependency changes** - When adding/updating dependencies
4. **After configuration changes** - When modifying config files
5. **Before deployment** - Final validation before production

**Optional Triggers:**
- On-demand when user requests validation
- After environment changes
- Before merging PRs (CI/CD integration)

## QA Validation Checklist

**Before Running QA Validation:**
- [ ] Design/planning phase completed
- [ ] All dependencies identified
- [ ] Configuration files created/updated
- [ ] Environment requirements documented

**During QA Validation:**
- [ ] Run all 4 validation points
- [ ] Document results for each point
- [ ] Fix issues as they're discovered
- [ ] Re-validate after fixes

**After QA Validation:**
- [ ] Generate validation report
- [ ] Update Memory Bank active context
- [ ] Log validation decision
- [ ] If PASS: Proceed to implementation
- [ ] If FAIL: Document blockers, wait for resolution

## Best Practices

1. **Run Early:** Don't wait until implementation - validate during planning
2. **Fix Immediately:** Address issues as they're found, don't accumulate
3. **Document Everything:** Keep detailed records of validation results
4. **Re-validate After Changes:** Run validation again after fixing issues
5. **Integrate with Memory Bank:** Always update Memory Bank with validation status
6. **Block Implementation:** Never proceed to ACT mode without PASS status

## Common Issues and Fixes

### Dependency Issues
- **Missing packages:** Install via package manager (pip, npm, etc.)
- **Version conflicts:** Update requirements, use version pinning
- **Incompatible versions:** Find compatible versions or alternatives

### Configuration Issues
- **JSON syntax errors:** Use JSON validator, fix syntax
- **YAML syntax errors:** Use YAML validator, check indentation
- **Missing required fields:** Add required configuration options

### Environment Issues
- **Missing tools:** Install required build tools
- **Permission denied:** Fix permissions or use appropriate user
- **Port conflicts:** Change port or stop conflicting service

### Build Test Issues
- **Build fails:** Check error messages, fix build configuration
- **Test fails:** Verify test setup, check dependencies
- **Import errors:** Verify package installation and paths
