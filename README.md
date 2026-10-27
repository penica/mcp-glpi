# MCP GLPI 3

A TypeScript Model Context Protocol server for **GLPI 12 High-Level API v3**. This major version uses OAuth bearer tokens and only calls `/api.php/v3` for GLPI resources. It does not support the legacy `/apirest.php` API.

## Requirements

- Node.js 18.18 or newer
- GLPI 12 with the High-Level API v3 enabled
- An OAuth client allowed to use the `password` grant and `api` scope; enable `user` scope for `glpi_get_my_profile` and current-user preference tools
- A GLPI user with permissions for the resources you intend to access

Create the OAuth client under **Setup → OAuth Clients** in GLPI. Use a dedicated GLPI account with the permissions appropriate for your MCP tools. Never commit credentials or place them in tool arguments.

## Install and run

```bash
npm ci
npm run build
export GLPI_URL='https://your-glpi-instance.example'
export GLPI_OAUTH_CLIENT_ID='your-client-identifier'
export GLPI_OAUTH_CLIENT_SECRET='your-client-secret'
export GLPI_USERNAME='your-glpi-username'
export GLPI_PASSWORD='your-glpi-password'
npm start
```

For a stdio MCP host, configure the command as `node` with argument `/absolute/path/to/mcp-glpi/dist/index.js` and provide those five environment variables. The server obtains a password-grant access token from `/api.php/token`, renews it before expiry, retries once on a 401, and sends bearer tokens only to `/api.php/v3` resource routes. Tokens and credentials are never printed by the server.

## Tool contracts

The server advertises 282 tools across tickets, problems, changes, timelines, validations, costs, recurring work, assets, users, groups, entities, contracts, suppliers, projects, documents, knowledge base, inventory, rules, and statistics. `glpi_snake_case` names describe their operations. GLPI permissions determine which calls succeed.

- List and search tools accept `filter` (v3 RSQL), `start`, `limit` (1–100), and `sort` (`property:asc` or `property:desc`). They return `{ "items": [...], "total": number }` when GLPI supplies a total header; otherwise `total` is omitted.
- Get tools take `id` and return the v3 object. Timeline reads contain `{ "type": ..., "item": ... }` entries.
- Create and update tools take a `data` object whose advertised JSON schema is derived from the instance's v3 OpenAPI document. Updates use `PATCH`; creation returns GLPI's new `id` and `href` when supplied.
- `entity_id`, `profile_id`, and `entity_recursive` select GLPI scope through request headers. Delete tools accept `force` where the endpoint supports it.
- `glpi_search` takes an `itemtype` from its advertised enum and a v3 `filter`. Numeric legacy search criteria are no longer accepted. Grouped tools for dropdowns, project links, asset contracts, rules, and components accept only published enum values.
- `glpi_get_{ticket,change,problem}_characteristic_stats` requires `field` (for example `priority`), and optionally accepts `date_start` and `date_end`. GLPI determines which fields it supports.
- `glpi_download_document` returns a `glpi://document/{id}/content` resource link. Reading that resource returns base64 binary data and its MIME type, with a 10 MiB limit. The ticket document-link write route returned 403 in the target instance during verification, so its live behavior remains unconfirmed.
- Webhook read tools omit `secret` and `clientsecret` values from their results.

Example tool arguments:

```json
{"filter":"name=ilike=*printer*","start":0,"limit":25,"sort":"id:desc"}
```

```json
{"data":{"name":"Printer offline","content":"The third-floor printer is unavailable."}}
```

```json
{"id":123,"data":{"type":"User","id":7,"role":"assigned"}}
```

The [migration log](docs/migration-log.md) maps all 82 original tools to v3 operations or removals and records the 3.1.0 expansion. The [expansion inventory](docs/additional-v3-tools.md) records the route families selected for 3.1.0. The [changelog](CHANGELOG.md) lists breaking changes. The schema source is the target instance's [v3 OpenAPI document](https://helpdesk.penic.net/api.php/v3/doc.json); other GLPI installations may publish different extensions or schema details.

## Development

```bash
npm ci
npm run build
npm run lint
npm test -- --runInBand
```

Refresh the selected v3 schemas and route manifest from the target instance's OpenAPI document with `python3 scripts/sync-v3-contract.py /path/to/doc.json`; use `--check` in CI to detect drift. The original 3.0.0 writable schemas are frozen in `scripts/v3-base-schemas.json` so existing tool arguments stay compatible.

The generated `dist/` directory is ignored. Tests mock OAuth and API responses; live checks require your own disposable GLPI records and credentials. The `dev` script is not supported because `ts-node` is not installed.

## License

MIT. See [LICENSE](LICENSE).
