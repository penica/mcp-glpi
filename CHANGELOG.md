# Changelog

## 3.1.0 — 2026-10-27

### Added

- Expanded from 90 to 282 v3 MCP tools: assistance timeline item lifecycle, validations, costs and recurring items; project tasks and links; asset CRUD and computer relationships; knowledge base comments and revisions; management and administration workflows; dropdown lookups, statistics, inventory, rules, and security reads.
- Added authenticated `glpi://document/{id}/content` resources for binary downloads up to 10 MiB. Document tools return resource links, keeping base64 out of ordinary tool text.
- Added reproducible OpenAPI schema and route-manifest generation and route-contract tests for every advertised tool. Updated the MCP SDK and its transitive lockfile dependencies; `npm audit` reports zero vulnerabilities.

### Behavior and verification

- Current-user tools obtain the OAuth `user` scope separately; their OAuth client must allow that scope. Existing API tools continue to use `api` scope.
- Characteristic statistics require a `field` argument, as the v3 endpoint requires. Webhook reads omit credential fields.
- Live checks passed for 26 new read routes after supplying required scope and statistics parameters; dedicated asset, management, project, assistance, knowledge base, and recurring records passed representative writes and were deleted. A document resource was read through MCP from an existing document. Ticket document linking returned 403 on a dedicated test record and remains unverified on the target instance; inventory requests were covered by mocked tests only.


## 3.0.0 — 2026-10-27

### Breaking changes

- Requires GLPI 12 High-Level API v3, OAuth client ID and secret, and GLPI username and password. Removes `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`, legacy sessions, and `/apirest.php` support.
- Lists use v3 RSQL `filter`, `start`, `limit`, and `sort` instead of legacy ranges and numeric search criteria. List output is `{items, total?}`. Create and update tools take a schema-based `data` object; updates use `PATCH`. All item outputs use v3 nested response schemas.
- Renames `glpi_get_{ticket,problem,change}_interactions` to `glpi_get_{ticket,problem,change}_timeline`; replaces local `glpi_get_asset_stats` with `glpi_list_assets_global`.
- Removes `glpi_add_user_to_group` because v3 publishes no group membership route. Removes `glpi_list_plugin_tags` and `glpi_search_plugin_tag_items` because the target v3 OpenAPI document publishes no Tags routes.
- Adds typed solution and team member tools for assistance items, plus the native asset list. Removes legacy MCP resources whose contracts depended on the old API.

### Verification

- Added Jest coverage for OAuth, bearer requests, token retry, v3 payloads, pagination, permissions, errors, and tool route mapping.
- Confirmed the published tool routes against the target instance's v3 OpenAPI document. Live authenticated collection reads and dedicated ticket create/read/update/filter/delete checks passed.
