# GLPI High-Level API migration research

Research date: 2026-10-27. Target: GLPI 12 and its latest High-Level API, v3. This records the API facts and repository changes needed to migrate this MCP from GLPI's legacy REST API. The target instance's versioned OpenAPI document is needed before endpoint-level implementation.

## Version and compatibility

- GLPI 11 introduced the High-Level API (HL API) as API v2. GLPI 12 adds v3 alongside v1 and v2. This migration targets **v3 only**. The existing `/apirest.php` integration is the legacy API. [GLPI developer documentation](https://glpi-developer-documentation.readthedocs.io/en/master/devapi/hlapi/index.html), [GLPI 12 release notes](https://www.glpi-project.org/en/glpi-12-release/)
- Use an explicit `/api.php/v3/...` version path. An unversioned `/api.php/...` request uses the server's latest API version; a major-only version resolves to the newest compatible minor version. GLPI 12 also supports the `GLPI-API-Version` request header. Pinning v3 avoids an unintended switch to a future major version. [GLPI API versioning](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2), [GLPI 12 release notes](https://www.glpi-project.org/en/glpi-12-release/)
- The instance's versioned `/api.php/v3/doc` UI and `/api.php/v3/doc.json` OpenAPI JSON are the authority for its installed routes. GLPI filters routes and schema properties by requested API version. Capture the v3 OpenAPI document and compare actual request and response schemas. [GLPI API documentation](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2), [GLPI versioning internals](https://glpi-developer-documentation.readthedocs.io/en/latest/devapi/hlapi/versioning.html)

## Authentication and request model

| Current MCP | High-Level API | Migration consequence |
| --- | --- | --- |
| `GET /apirest.php/initSession`, `Session-Token`, `killSession` | OAuth2 `POST /api.php/token`, then `Authorization: Bearer <access_token>` | Replace session lifecycle with token acquisition, expiry tracking, and reacquisition. |
| `App-Token` plus `user_token` or Basic username/password | Registered OAuth client ID and secret, plus user credentials for the password grant | Add OAuth client configuration; a legacy user token alone cannot authenticate to HL API. |
| Legacy `input` wrapper and `PUT` updates | Schema-defined JSON requests and `PATCH` routes | Map each write payload from the versioned OpenAPI schema. |
| Numeric search option IDs and `criteria[...]` | RSQL `filter` with schema property names | Translate search behavior per item schema; numeric field IDs cannot be reused. |
| `range=0-49`, `searchText[...]`, `with_*`, `expand_dropdowns` | Endpoint-specific query parameters and nested schema properties | Replace list, pagination, related data, and response handling per route. |

The password grant is documented for automated scripts. It requires `grant_type=password`, `client_id`, `client_secret`, `username`, `password`, and `scope=api`; the response contains `access_token` and `expires_in`. The authorization code grant is intended for interactive applications and can return a refresh token. Client credentials cannot access ordinary API resources; GLPI currently limits that grant to inventory scope. Register clients under **Setup > OAuth Clients**. [GLPI authentication guide](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2)

RSQL supports comparison, `=in=`, `=like=`, `=ilike=`, null and empty checks; available fields depend on each endpoint's returned schema. GraphQL is a read-only wrapper and therefore cannot replace write routes. [GLPI filtering and GraphQL guide](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2)

## Current MCP surface

`src/index.ts` declares 82 MCP tools. `src/glpi-client.ts` has 95 public async client methods and 19 direct `/apirest.php` call sites. A migration of only the generic CRUD helpers would leave followups, tasks, assignment, search, plugin tags, and session info on the legacy API.

| Existing feature | Current code | HL API route family to validate |
| --- | --- | --- |
| Tickets, problems, changes | `Ticket`, `Problem`, `Change` CRUD and `search/<itemtype>` | `/Assistance/{itemtype}` and `/{id}`; `GET`, `POST`, `PATCH`, `DELETE` routes exist from v2.0 in [ITILController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/ITILController.php). |
| Followups, tasks, solutions, approvals | `ITILFollowup`, `TicketTask`/`ProblemTask`/`ChangeTask`, `ITILSolution`, subitems | `/Assistance/{itemtype}/{id}/Timeline` and typed timeline routes; inspect per-type operations and schemas in [ITILController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/ITILController.php). |
| Ticket assignment | `Ticket_User` with legacy actor fields | HL API team member routes under `/Assistance/{itemtype}/{id}/TeamMember`; confirm roles and input schema in [ITILController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/ITILController.php). |
| Computers and other assets | Generic item CRUD with legacy flat fields | `/Assets/{itemtype}` routes and nested asset schemas in [AssetController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/AssetController.php). |
| Users, groups, entities | Generic CRUD, `Group_User`, legacy profile/session endpoints | `/Administration/User`, `/Group`, `/Entity`, plus `/User/Me` and `/session`; inspect membership and profile support in [AdministrationController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/AdministrationController.php) and [CoreController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/CoreController.php). |
| Contracts, suppliers, documents | Generic item routes | `/Management/{itemtype}` in [ManagementController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/ManagementController.php). |
| Projects | Generic `Project` routes | `/Project` routes in [ProjectController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/ProjectController.php). |
| Categories and locations | `ITILCategory`, `Location` | `/Dropdowns/{itemtype}` in [DropdownController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/DropdownController.php); verify supported types. |
| Knowledge base | `KnowbaseItem`, `search/KnowbaseItem` | `/Knowledgebase/Article` routes remain in v3; `/Knowledgebase/Category` routes were removed in v3.0. Map old article fields and GLPI 12's nested articles using [KnowbaseController](https://github.com/glpi-project/glpi/blob/main/src/Glpi/Api/HL/Controller/KnowbaseController.php) and [GLPI 12 notes](https://www.glpi-project.org/en/glpi-12-release/). |
| Plugin Tags | `PluginTagTag`, `PluginTagTagItem` | No equivalent established in the core route families above. Validate the installed Tags plugin's HL API support; otherwise this feature needs a documented compatibility decision. [HL API schema exposure differs from legacy API](https://glpi-developer-documentation.readthedocs.io/en/latest/devapi/hlapi/schemas.html). |
| Statistics | Reads up to 10,000 records and counts locally | Use filtered queries and server-reported totals only after confirming endpoint semantics; current counts may be incomplete for larger instances. |

These route families are confirmed from GLPI's source, but the table is **not** a claim that every current MCP operation has a working one-to-one replacement. In particular, HL API schemas do not automatically expose every legacy `CommonDBTM` item or search option. [GLPI schema documentation](https://glpi-developer-documentation.readthedocs.io/en/latest/devapi/hlapi/schemas.html)

## Proposed migration sequence

1. Obtain a GLPI 12 instance's v3 OpenAPI JSON. Inventory every MCP tool against concrete v3 operations and request/response schemas. Mark unsupported operations explicitly.
2. Add an HL API transport pinned to v3, with OAuth password grant, token expiry handling, central error parsing, and common query handling. Keep credentials out of logs and error text.
3. Define adapters for ticket, problem, change, timeline, and team schemas; migrate those tools and validate reads and writes on a disposable GLPI instance.
4. Migrate assets, administration, management, projects, dropdowns, knowledge base, and searches against v3 schemas.
5. Resolve plugin Tags and legacy-only operations: retain a clearly named legacy adapter temporarily, replace with plugin HL routes if available, or remove the affected tool only as an explicit compatibility decision.
6. Test the MCP tool contracts end to end against GLPI 12, including pagination, permissions, entity scope, token renewal, and write/readback. Update installation instructions and release notes.

## Information needed for implementation

- The target GLPI 12 minor release and its `/api.php/v3/doc.json` export, or access to a disposable instance, plus an OAuth client configured for password grant and a test user with the needed rights. No credentials should be committed to the repository.
- A decision on whether all 82 tool names and output shapes must stay compatible, and whether plugin Tags must work without legacy API fallback.

## Sources

- [GLPI High-Level API user guide](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2)
- [GLPI High-Level API developer documentation](https://glpi-developer-documentation.readthedocs.io/en/master/devapi/hlapi/index.html)
- [GLPI HL API schema documentation](https://glpi-developer-documentation.readthedocs.io/en/latest/devapi/hlapi/schemas.html)
- [GLPI 12 API release information](https://www.glpi-project.org/en/glpi-12-release/)
- [GLPI API controller source](https://github.com/glpi-project/glpi/tree/main/src/Glpi/Api/HL/Controller)
