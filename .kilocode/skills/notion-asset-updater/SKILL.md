# Notion Asset Research Updater

## Purpose
Update the shared Asset Research workspace with new findings from Perplexity + web monitoring.

## Integration Points
- **Input**: Asset watchlist + research findings
- **Output**: Notion database entries + visualization requests
- **Tools**: Notion API, Perplexity search results

## Update Logic
1. Query Perplexity for asset (ticker)
2. Extract key findings with confidence scores
3. Determine visualization needs
4. Write to Notion with metadata
5. If new pattern detected → request visualization build

## Example Rules
- Sentiment shift → "Medium" confidence minimum to update
- Technical breakout → Always visualize
- Correlation break → Route to Neo4j + Letta
- News event → Link to source, flag as urgent

## Failure Handling
- If Notion API fails: Queue update for retry
- If Perplexity unavailable: Use cached findings with "stale" flag
- If confidence too low: Tag "needs_verification"
