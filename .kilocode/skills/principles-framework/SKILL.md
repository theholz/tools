---
name: principles-framework
description: 'Location and usage of the Principles Framework (first-principles agent decomposition). Use when designing multi-agent systems, generating agent specs, or building Kilocode skills from decomposed agents.'
source: project
metadata:
  path: vendor/principles
---

# Principles Framework (Project Access)

**Shared access:** Cursor and Kilocode agents both use this skill to find and run the Principles Framework.

## Location (in this project)

- **Path:** `vendor/principles` (relative to project root)
- **Absolute (example):** `PROJECT_ROOT/vendor/principles` or `$PROJECT_ROOT/vendor/principles`

The framework is installed inside the project for reproducibility. Bootstrap script: `scripts/bootstrap-trading-agents.sh`.

## When to use

- Designing or decomposing multi-agent systems (first-principles)
- Generating agent specs from a goal description
- Converting agent JSON specs into Kilocode skills
- Trading platform / skill-architect workflows that reference Principles

## How to run (from project root)

```bash
cd vendor/principles
npm run generate-agents "<goal description>"
```

Output is typically under `vendor/principles/packages/<id>-<name>/agents/*.json`. The bootstrap script converts those JSON specs into Kilocode skills under `~/.kilocode/skills/`.

## Cursor agents

- Read this skill from `framework/kilocode-skills/principles-framework/` (symlink to `~/.kilocode/skills`).
- Principles Framework lives at **`vendor/principles`**; use it when the task involves agent decomposition or skill design from first principles.

## Kilocode agents

- This skill is loaded from `~/.kilocode/skills/principles-framework/`.
- When working on trading agents, skill design, or multi-agent architecture, use **`vendor/principles`** (project-relative) to generate or refine agent specs.
