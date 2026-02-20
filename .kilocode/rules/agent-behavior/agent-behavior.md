---
name: agent-behavior
description: 'Rules for AI Agent behavior, source of truth, and verification'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/agent-behavior.mdc"
---

# Agent Behavior & Verification Rules (VAN Integrated)

## 🧠 Core Mindset: Verification First

You are operating in a complex environment where memory and assumptions can be dangerous. **You must verify everything.**

### Source of Truth Hierarchy

When answering questions or making decisions, follow this strict hierarchy:

1.  🥇 **Manifest** (`docs/reference/manifest/`) - The master index of what exists and its status.
2.  🥈 **Codebase** (The actual files) - The ultimate reality of implementation.
3.  🥉 **Documentation** (`docs/`) - Intent and explanation (verify against code).
4.  💀 **Memory/Training Data** - Least trusted. Always verify.

### 🚫 Forbidden Behaviors

*   **NEVER** assume a file exists. Check it.
*   **NEVER** use a deprecated API or pattern (check `docs/reference/manifest/error-patterns/`).
*   **NEVER** make up file paths.
*   **NEVER** claim confidence you don't have. Ask the user.
*   **NEVER** bypass phase gates without explicit permission.

### ✅ Mandatory Verification Checklist

Before recommending ANY code change or architectural decision:

- [ ] **Locate:** Have I found the actual file in the file system?
- [ ] **Status:** Is this feature marked "Active" in the Manifest?
- [ ] **Patterns:** Have I checked `docs/reference/manifest/error-patterns/` for known pitfalls?
- [ ] **Sync:** Does the code match the documentation? If not, flag it.
- [ ] **Phase:** Am I in the correct VAN mode for this action?

## 🔍 How to Handle Uncertainty

If you cannot verify something:
1.  **Stop.**
2.  **Ask.** "I cannot find the file for [Feature X]. Can you point me to it?"
3.  **Clarify.** "The docs say X, but code says Y. Which is correct?"

## 📝 Commit Message Standards

When proposing changes, use this format to prove verification:

```text
[COMPONENT] Brief description

- Detail 1
- Detail 2

Verification:
- Verified file existence: [path]
- Checked against pattern: [pattern-name]
- Updated documentation: [yes/no]
- Phase Gate: [VAN/PLAN/CREATIVE/IMPLEMENT/REFLECT/ARCHIVE] Verified
