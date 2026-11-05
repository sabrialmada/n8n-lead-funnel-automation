# Infrastructure & Security

The platform runs on a dedicated VPS, separate from the website's hosting.
The live website does not depend on it today, so the automation server can be
changed or taken offline without affecting the site.

The Compose and Caddy files in [`infra/`](../infra/) come from the running
server, anonymized. `infra/backup-workflows.sh` is an illustrative example.

## Stack

```
Internet ──443──▶ Caddy (TLS, reverse proxy)
                     │  Docker Compose network
                     ▼
                   n8n ──────▶ PostgreSQL 17 (n8n's own state)
                     │
                     ├──▶ Managed Postgres (leads table, shared with website)
                     ├──▶ Brevo API (CRM + transactional email)
                     └──▶ Meta Conversions API
```

- **n8n** stores workflows, credentials (encrypted with `N8N_ENCRYPTION_KEY`)
  and execution history in its own PostgreSQL instead of the default SQLite.
- **Caddy** handles HTTPS with automatic certificates and is the only
  container that publishes ports.
- **PostgreSQL** and **n8n** publish no ports to the host. They are reachable
  only from inside the Compose network.

## Server hardening

| Control | Detail |
|---|---|
| SSH | Key-only authentication; password auth disabled |
| Accounts | Root login disabled; a dedicated non-root `deploy` user |
| Firewall | UFW allows only ports 22, 80 and 443 |
| Brute force | fail2ban blocks repeated failed access attempts |
| Secrets | Kept in a server-side `.env` (not in Git); n8n credentials encrypted at rest |

## Backups

A daily cron job:

1. Exports every workflow as JSON (credentials are **not** included).
2. Pushes the export to a private GitHub repository.
3. Authenticates with a **deploy key scoped to that single repository**, so
   the key gives no access to anything else on the account.

This gives a diff-able history of every workflow change. Workflows can be
restored from Git. Credentials are not in the backup, so they would have to be
re-entered on a rebuilt server.

## Development workflow

Workflows are built with schema-aware n8n tooling (an MCP server connected to
the instance through a scoped API key), checked for configuration errors, then
tested end-to-end with disposable test data.
