# Jupiter DEX

### Basic Information

- **Package Name:** `n8n-nodes-jupiter-dex`
- **Category:** 💰 Finance & Crypto
- **Primary Use Case:** Swap tokens and get quotes on Solana via Jupiter Aggregator
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-jupiter-dex](https://www.npmjs.com/package/n8n-nodes-jupiter-dex)

### Installation Command

```bash
npm install n8n-nodes-jupiter-dex
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Jupiter DEX | `n8n-nodes-jupiter-dex.jupiterDex` | 1 | Finance Tool |

### Node Description

Integrates with the Jupiter Aggregator on the Solana blockchain. Allows workflows to fetch real-time token prices, get swap quotes, and execute token swaps efficiently across multiple liquidity sources.

### Available Operations

1. **Get Quote** (`getQuote`)
   - Get the best price for a token swap
   - Parameters: Input Mint, Output Mint, Amount
   - Returns: Quote details, routes

2. **Swap** (`swap`)
   - Execute a token swap (requires private key)
   - Parameters: Quote ID, Wallet Config
   - Returns: Transaction signature

3. **Get Token Price** (`getPrice`)
   - Fetch current price of a token in USDC/SOL
   - Parameters: Token ID/Symbol
   - Returns: Price data

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `getQuote` | Operation to perform |
| `inputMint` | string | Yes | - | Mint address of input token |
| `outputMint` | string | Yes | - | Mint address of output token |
| `amount` | number | Yes | - | Amount to swap (in raw units or decimals) |
| `slippageBps` | number | No | `50` | Max slippage in basis points (e.g., 50 = 0.5%) |

### Credentials Required

**Credential Type:** `solanaWallet` (for Swaps only)

| Field | Required | Description |
|-------|----------|-------------|
| `Private Key` | Yes | Solana Wallet Private Key (Base58) |
| `RPC URL` | No | Custom RPC endpoint (optional) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Token details |
| **Output Fields** | `data` (price/quote info), `txId` (for swaps) |

### Example Usage

```json
{
  "name": "Check SOL Price",
  "type": "n8n-nodes-jupiter-dex.jupiterDex",
  "typeVersion": 1,
  "position": [400, 300],
  "parameters": {
    "operation": "getPrice",
    "inputMint": "So11111111111111111111111111111111111111112"
  }
}
```

### Common Use Cases

- Automated DCA (Dollar Cost Averaging) bots
- Portfolio tracking dashboards
- Arbitrage opportunity monitoring
- Converting payments received in one token to stablecoins automatically

### Important Notes

- **Financial Risk:** executing swaps involves real assets. Test with small amounts.
- Network fees (SOL) are required for transactions.
- RPC rate limits may apply; consider using a private RPC for high-frequency usage.
