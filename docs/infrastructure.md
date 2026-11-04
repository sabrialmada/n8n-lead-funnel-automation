# Infrastructure & Security

The platform runs on a dedicated VPS owned by the client, fully separate
from the website's hosting. Nothing in n8n can take the website down; the
website keeps working even if the automation server is offline.

## Stack

```
Internet ──443──▶ Caddy (TLS, reverse proxy)
                     │  internal Docker network
                     ▼
                   n8n ──────▶ PostgreSQL 17 (n8n's own state)
                     │
                     ├──▶ Managed Postgres (leads table, shared with website)
                     ├──▶ Brevo API (CRM + transactional email)
                     └──▶ Meta Conversions API
```

- **n8n** stores workflows, credentials (encrypted with `N8N_ENCRYPTION_KEY`)
  and execution history in its own PostgreSQL instead of the default SQLite,
  for durability and concurrent executions.
- **Caddy** terminates HTTPS with automatically renewed Let's Encrypt
  certificates and is the only container that publishes ports.
- **PostgreSQL** is not exposed to the host or the internet.

## Server hardening

| Control | Detail |
|---|---|
| SSH | Key-only authentication; password auth disabled |
| Accounts | Root login disabled; a non-root `deploy` user with sudo |
| Firewall | UFW default-deny inbound; only 22, 80, 443 open |
| Brute force | fail2ban bans IPs after repeated failed SSH attempts |
| Isolation | Services on a private Docker network; only Caddy is public |
| Secrets | Kept in a server-side `.env` (not in Git); n8n credentials encrypted at rest |

## Backups

A daily cron job:

1. Exports every workflow as JSON with the n8n CLI (credentials are **not**
   included in the export).
2. Commits the export to a private GitHub repository.
3. Pushes using a **deploy key scoped to that single repository**, so a
   compromised server could not read or write anything else on the account.

This gives point-in-time, diff-able history for every workflow change and
lets the whole platform be rebuilt on a fresh VPS from Git plus the `.env`.

## Development workflow

Workflows are built with schema-aware n8n tooling (MCP server connected to
the instance through a scoped API key), validated for structure, connections
and expressions, then tested end-to-end with disposable test data before
being activated.
