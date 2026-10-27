# MCP GLPI 3

A TypeScript Model Context Protocol server for **GLPI 12 High-Level API v3**. This major version uses OAuth bearer tokens and only calls `/api.php/v3` for GLPI resources. It does not support the legacy `/apirest.php` API.

## Requirements

- Node.js 18.18 or newer
- GLPI 12 with the High-Level API v3 enabled
- An OAuth client allowed to use the `password` grant and `api` scope
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

The server advertises 90 tools across tickets, problems, changes, timelines, teams, assets, users, groups, entities, contracts, suppliers, locations, projects, documents, knowledge base, search, and statistics. `glpi_snake_case` names describe their operations. GLPI permissions determine which calls succeed.

- List and search tools accept `filter` (v3 RSQL), `start`, `limit` (1–100), and `sort` (`property:asc` or `property:desc`). They return `{ "items": [...], "total": number }` when GLPI supplies a total header; otherwise `total` is omitted.
- Get tools take `id` and return the v3 object. Timeline reads contain `{ "type": ..., "item": ... }` entries.
- Create and update tools take a `data` object whose advertised JSON schema is derived from the instance's v3 OpenAPI document. Updates use `PATCH`; creation returns GLPI's new `id` and `href` when supplied.
- `entity_id`, `profile_id`, and `entity_recursive` select GLPI scope through request headers. Delete tools accept `force` where the endpoint supports it.
- `glpi_search` takes an `itemtype` from its advertised enum and a v3 `filter`. Numeric legacy search criteria are no longer accepted.

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

The [migration log](docs/migration-log.md) maps all 82 previous tools to v3 operations or removals. The [candidate tool list](docs/additional-v3-tools.md) prioritizes useful v3 routes that are not yet integrated. The [changelog](CHANGELOG.md) lists breaking changes. The schema source is the target instance's [v3 OpenAPI document](https://helpdesk.penic.net/api.php/v3/doc.json); other GLPI installations may publish different extensions or schema details.

## Development

```bash
npm ci
npm run build
npm run lint
npm test -- --runInBand
```

The generated `dist/` directory is ignored. Tests mock OAuth and API responses; live checks require your own disposable GLPI records and credentials. The `dev` script is not supported because `ts-node` is not installed.

## License

MIT. See [LICENSE](LICENSE).
