# GLPI API migration log

This log tracks decisions, research, implementation, and verification for moving the MCP from GLPI's legacy API to the High-Level API. Keep entries dated and link each substantive change to its commit or pull request when available. Do not record credentials or private instance data.

## 2026-10-27

- Forked `DavyCaetano/mcp-glpi` into `penica/mcp-glpi` and connected the local checkout to `origin`; the source repository is `upstream`.
- Audited the current MCP surface: 82 declared tools, 95 public async client methods, and 19 direct legacy `/apirest.php` call sites.
- Read GLPI's official High-Level API documentation, GLPI 12 release notes, and API controller source. Recorded the authentication, versioning, search, route, and schema migration findings in [GLPI High-Level API migration research](glpi-high-level-api-migration.md).
- Decided the target is **GLPI 12 with the latest High-Level API, v3**. Request paths will pin major version 3. GLPI 11 and API v2 are outside the migration target.
- Verified the unmodified upstream project builds with `npm ci --ignore-scripts` and `npm run build`.
- Next: obtain a GLPI 12 v3 OpenAPI document, map each MCP tool to concrete operations and schemas, then implement the new transport and adapters.
