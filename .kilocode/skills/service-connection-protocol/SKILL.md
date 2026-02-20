---
name: service-connection-protocol
description: MANDATORY protocol for connecting to services (Letta, n8n, etc.). Prevents "localhost" errors by enforcing Caddy/Docker DNS checks.
source: cursor-rules
---

# 🔌 Service Connection Protocol

**CRITICAL:** Agents often fail by assuming `localhost` works for everything. It does NOT.
This protocol enforces a strict check before attempting ANY connection.

## 🛑 STOP & CHECK

Before connecting to a service (e.g., Letta, n8n, Qdrant), determine your **Execution Context**:

### Context A: "I am running a script on the Host" (e.g. `python scripts/upload.py`)
1.  **Check Caddy (`Caddyfile` or `.env`):**
    *   Is there a `*_HOSTNAME` defined? (e.g., `LETTA_HOSTNAME=letta.holbrook.app`)
    *   **Check Protocol:** Look at `Caddyfile`. Does it enforce `https://`? If not explicitly set, `http://` might be the correct entry point (especially for internal domains).
    *   **Heuristic:** Try `http://<HOSTNAME>` FIRST if `https://` fails or if the domain looks internal (`.localhost` or custom TLD).
2.  **Check Docker Mapping (`docker-compose.yml`):**
    *   Are ports mapped? (e.g., `8283:8283`)
    *   **Fallback:** Use `http://localhost:<EXTERNAL_PORT>` if Caddy is unreachable.
    *   *Warning:* May fail if service binds to internal IP only or requires specific headers.

### Context B: "I am running inside a Container" (e.g. n8n workflow, another docker service)
1.  **Check Service Name (`docker-compose.yml`):**
    *   Use the service name as the hostname.
    *   **Priority 1:** Use `http://<SERVICE_NAME>:<INTERNAL_PORT>` (e.g., `http://letta:8283`)
    *   *Note:* Do NOT use `localhost`. Do NOT use `https` unless configured internally.

---

## 📋 Mandatory Connection Checklist

Before writing code or executing commands to connect:

- [ ] **Identify Target Service:** (e.g., Letta)
- [ ] **Identify My Context:** (Host or Container?)
- [ ] **Find Caddy Hostname:** `grep LETTA_HOSTNAME .env` -> `letta.holbrook.app`
- [ ] **Check Caddyfile:** Does it serve on 80 (HTTP) or 443 (HTTPS)?
    - If unsure, try **HTTP** first, then HTTPS.
- [ ] **Find Internal Port:** `grep -A 10 "letta:" docker-compose.yml` -> `8283`
- [ ] **Construct URL:**
    - Host (Caddy): `http://letta.holbrook.app` OR `https://letta.holbrook.app`
    - Host (Direct): `http://localhost:8283`
    - Container: `http://letta:8283`
- [ ] **Verify Auth:**
    - Does it need a password? (`LETTA_SERVER_PASSWORD`)
    - Does it need a token? (`N8N_API_KEY`)

## 🚫 Common Pitfalls

*   ❌ `http://localhost:8283` -> Often blocked or connection refused if service listens on `172.x.x.x`.
*   ❌ `https://letta.holbrook.app` -> Don't assume HTTPS. Caddy might handle HTTP on internal networks.
*   ❌ `0.0.0.0` -> Valid for binding, invalid for connecting from another machine/container.

## 🛠️ Verification Command

If unsure, verify reachability BEFORE running complex scripts:

```bash
# Try Caddy HTTP (Priority 1)
curl -I http://letta.holbrook.app/v1/health

# Try Caddy HTTPS (Priority 2)
curl -I -k https://letta.holbrook.app/v1/health

# Try Localhost Mapped (Fallback)
curl -v http://localhost:8283/v1/health

# Try Internal DNS (Only works inside container)
curl -v http://letta:8283/v1/health
```
