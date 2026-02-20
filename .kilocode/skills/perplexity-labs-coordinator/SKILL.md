# Perplexity Labs Build Coordinator

## Purpose
Request custom visualization and analysis apps when new trading patterns emerge.

## When to Trigger
- New correlation discovered
- Asset behavior breaks historical patterns
- Cross-asset signals align
- Volatility regime shift

## Request Template
```json
{
  "project": "Trading Platform Assets",
  "request_type": "visualization",
  "asset_or_pattern": "Description of pattern",
  "data_sources": ["Neo4j queries", "Perplexity research"],
  "required_outputs": ["Chart type", "Metrics"],
  "integrations_needed": ["n8n", "Neo4j", "Notion"],
  "priority": "High/Medium/Low",
  "context": "Link to Notion asset page"
}
```

## Integration Flow
1. AssetResearchOrchestrator detects new pattern
2. Generates build request with context
3. Sends to Perplexity Labs via API/form
4. Tracks request in Notion
5. Once built, registers app in Kilocode skills
