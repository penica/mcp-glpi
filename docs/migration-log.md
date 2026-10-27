# GLPI API migration log

This log tracks the GLPI 12 API v3 migration. The instance OpenAPI document at `https://helpdesk.penic.net/api.php/v3/doc.json` was read on 2026-10-27. It published 1,181 paths and no Tags route. No credentials or private instance data are recorded here.

## 2026-10-27

- Replaced the 19 legacy `/apirest.php` call sites with OAuth password grant and a centralized `/api.php/v3` transport.
- Generated writable MCP `data` schemas from the instance OpenAPI definitions. v3 returns nested objects and uses `PATCH`, RSQL `filter`, `start`, `limit`, and `sort`.
- Checked every published tool method and path against the OpenAPI routes.
- Live verification: authenticated session and 22 collection/statistic reads passed; a dedicated ticket passed create, read, update, filtered search, and forced delete. A dedicated timeline ticket accepted followup, task, and team member writes and was deleted.
- Jest, TypeScript build, and ESLint passed.

## 3.1.0 expansion — 2026-10-27

- Added 192 tools for the three priority groups in the expansion inventory. The catalog now contains 282 unique tool names. Every concrete method and route, including all enum expansions, matched the target instance's 1,181-path v3 OpenAPI document.
- Added typed path resolution, selected writable schemas, a generated route manifest, a separate OAuth `user` scope token for current-user routes, and bounded binary document resources. The 3.0.0 schemas are preserved for existing tool compatibility.
- Corrected the candidate inventory: v3 publishes no top-level SoftwareLicense or DCRoom CRUD route. Management License CRUD is included; DCRoom remains available only in published relationship routes.
- Live reads passed for new project, asset, management, administration, inventory, webhook, notification, rule, security, dropdown, recurring, and statistics families. Characteristic statistics need `field`; `priority` passed. The server returned an error for `status` on that endpoint, so supported group fields remain determined by GLPI.
- Dedicated records passed create/read/update/delete checks for assets, budgets, contacts, licenses, project tasks and links, ticket validation, knowledge base articles and comments, recurring tickets, and computer volume and contract relationships. All created records were deleted. A metadata-only document could not be downloaded; an existing document downloaded successfully through the MCP binary resource. Ticket document linking returned 403 even for a dedicated test ticket and document; the tool uses the controller's `Document_Item` schema, and this route remains unverified on the target instance. No inventory request was sent to a real agent.
- Build, lint, Jest, MCP stdio, binary resource checks, and `npm audit` (zero vulnerabilities) passed. The temporary OAuth client used for verification was removed.

## Existing tool inventory

Every retained list or search tool now accepts `filter`, `start`, `limit`, and `sort` where supported; list responses are `{items, total?}`. Every retained create or update tool accepts a v3 schema `data` object directly and returns the v3 response. Item reads return v3 nested schemas. The tool catalog is the exact argument source; old flat arguments, `range`, `criteria`, legacy `with_*` flags, and old session outputs are removed. `entity_id`, `profile_id`, and `entity_recursive` map to the v3 scope headers.

| Previous tool | v3 tool | Operation or decision |
| --- | --- | --- |
| `glpi_list_tickets` | `glpi_list_tickets` | `GET /Assistance/Ticket` |
| `glpi_get_ticket` | `glpi_get_ticket` | `GET /Assistance/Ticket/{id}` |
| `glpi_create_ticket` | `glpi_create_ticket` | `POST /Assistance/Ticket` |
| `glpi_update_ticket` | `glpi_update_ticket` | `PATCH /Assistance/Ticket/{id}` |
| `glpi_delete_ticket` | `glpi_delete_ticket` | `DELETE /Assistance/Ticket/{id}` |
| `glpi_add_followup` | `glpi_add_followup` | `POST /Assistance/Ticket/{id}/Timeline/Followup` |
| `glpi_add_task` | `glpi_add_task` | `POST /Assistance/Ticket/{id}/Timeline/Task` |
| `glpi_add_solution` | `glpi_add_solution` | `POST /Assistance/Ticket/{id}/Timeline/Solution` |
| `glpi_assign_ticket` | `glpi_assign_ticket` | `POST /Assistance/Ticket/{id}/TeamMember` |
| `glpi_get_ticket_tasks` | `glpi_get_ticket_tasks` | `GET /Assistance/Ticket/{id}/Timeline/Task` |
| `glpi_get_ticket_followups` | `glpi_get_ticket_followups` | `GET /Assistance/Ticket/{id}/Timeline/Followup` |
| `glpi_get_ticket_interactions` | `glpi_get_ticket_timeline` | `GET /Assistance/Ticket/{id}/Timeline` |
| `glpi_list_problems` | `glpi_list_problems` | `GET /Assistance/Problem` |
| `glpi_get_problem` | `glpi_get_problem` | `GET /Assistance/Problem/{id}` |
| `glpi_create_problem` | `glpi_create_problem` | `POST /Assistance/Problem` |
| `glpi_update_problem` | `glpi_update_problem` | `PATCH /Assistance/Problem/{id}` |
| `glpi_add_problem_followup` | `glpi_add_problem_followup` | `POST /Assistance/Problem/{id}/Timeline/Followup` |
| `glpi_get_problem_followups` | `glpi_get_problem_followups` | `GET /Assistance/Problem/{id}/Timeline/Followup` |
| `glpi_add_problem_task` | `glpi_add_problem_task` | `POST /Assistance/Problem/{id}/Timeline/Task` |
| `glpi_get_problem_tasks` | `glpi_get_problem_tasks` | `GET /Assistance/Problem/{id}/Timeline/Task` |
| `glpi_get_problem_interactions` | `glpi_get_problem_timeline` | `GET /Assistance/Problem/{id}/Timeline` |
| `glpi_list_changes` | `glpi_list_changes` | `GET /Assistance/Change` |
| `glpi_get_change` | `glpi_get_change` | `GET /Assistance/Change/{id}` |
| `glpi_create_change` | `glpi_create_change` | `POST /Assistance/Change` |
| `glpi_update_change` | `glpi_update_change` | `PATCH /Assistance/Change/{id}` |
| `glpi_add_change_followup` | `glpi_add_change_followup` | `POST /Assistance/Change/{id}/Timeline/Followup` |
| `glpi_get_change_followups` | `glpi_get_change_followups` | `GET /Assistance/Change/{id}/Timeline/Followup` |
| `glpi_add_change_task` | `glpi_add_change_task` | `POST /Assistance/Change/{id}/Timeline/Task` |
| `glpi_get_change_tasks` | `glpi_get_change_tasks` | `GET /Assistance/Change/{id}/Timeline/Task` |
| `glpi_get_change_interactions` | `glpi_get_change_timeline` | `GET /Assistance/Change/{id}/Timeline` |
| `glpi_list_computers` | `glpi_list_computers` | `GET /Assets/Computer` |
| `glpi_get_computer` | `glpi_get_computer` | `GET /Assets/Computer/{id}` |
| `glpi_create_computer` | `glpi_create_computer` | `POST /Assets/Computer` |
| `glpi_update_computer` | `glpi_update_computer` | `PATCH /Assets/Computer/{id}` |
| `glpi_delete_computer` | `glpi_delete_computer` | `DELETE /Assets/Computer/{id}` |
| `glpi_list_softwares` | `glpi_list_softwares` | `GET /Assets/Software` |
| `glpi_get_software` | `glpi_get_software` | `GET /Assets/Software/{id}` |
| `glpi_create_software` | `glpi_create_software` | `POST /Assets/Software` |
| `glpi_list_network_equipments` | `glpi_list_network_equipments` | `GET /Assets/NetworkEquipment` |
| `glpi_get_network_equipment` | `glpi_get_network_equipment` | `GET /Assets/NetworkEquipment/{id}` |
| `glpi_list_printers` | `glpi_list_printers` | `GET /Assets/Printer` |
| `glpi_get_printer` | `glpi_get_printer` | `GET /Assets/Printer/{id}` |
| `glpi_list_monitors` | `glpi_list_monitors` | `GET /Assets/Monitor` |
| `glpi_get_monitor` | `glpi_get_monitor` | `GET /Assets/Monitor/{id}` |
| `glpi_list_phones` | `glpi_list_phones` | `GET /Assets/Phone` |
| `glpi_get_phone` | `glpi_get_phone` | `GET /Assets/Phone/{id}` |
| `glpi_list_knowbase` | `glpi_list_knowbase` | `GET /Knowledgebase/Article` |
| `glpi_get_knowbase_item` | `glpi_get_knowbase_item` | `GET /Knowledgebase/Article/{article_id}` |
| `glpi_search_knowbase` | `glpi_search_knowbase` | `GET /Knowledgebase/Article` |
| `glpi_create_knowbase_item` | `glpi_create_knowbase_item` | `POST /Knowledgebase/Article` |
| `glpi_list_contracts` | `glpi_list_contracts` | `GET /Management/Contract` |
| `glpi_get_contract` | `glpi_get_contract` | `GET /Management/Contract/{id}` |
| `glpi_create_contract` | `glpi_create_contract` | `POST /Management/Contract` |
| `glpi_list_suppliers` | `glpi_list_suppliers` | `GET /Management/Supplier` |
| `glpi_get_supplier` | `glpi_get_supplier` | `GET /Management/Supplier/{id}` |
| `glpi_create_supplier` | `glpi_create_supplier` | `POST /Management/Supplier` |
| `glpi_list_locations` | `glpi_list_locations` | `GET /Dropdowns/Location` |
| `glpi_get_location` | `glpi_get_location` | `GET /Dropdowns/Location/{id}` |
| `glpi_create_location` | `glpi_create_location` | `POST /Dropdowns/Location` |
| `glpi_list_projects` | `glpi_list_projects` | `GET /Project/` |
| `glpi_get_project` | `glpi_get_project` | `GET /Project/{id}` |
| `glpi_create_project` | `glpi_create_project` | `POST /Project/` |
| `glpi_update_project` | `glpi_update_project` | `PATCH /Project/{id}` |
| `glpi_list_users` | `glpi_list_users` | `GET /Administration/User` |
| `glpi_get_user` | `glpi_get_user` | `GET /Administration/User/{id}` |
| `glpi_search_user` | `glpi_search_user` | `GET /Administration/User` |
| `glpi_create_user` | `glpi_create_user` | `POST /Administration/User` |
| `glpi_list_groups` | `glpi_list_groups` | `GET /Administration/Group` |
| `glpi_get_group` | `glpi_get_group` | `GET /Administration/Group/{id}` |
| `glpi_create_group` | `glpi_create_group` | `POST /Administration/Group` |
| `glpi_add_user_to_group` | Removed | No v3 group membership route |
| `glpi_list_categories` | `glpi_list_categories` | `GET /Dropdowns/ITILCategory` |
| `glpi_list_entities` | `glpi_list_entities` | `GET /Administration/Entity` |
| `glpi_get_entity` | `glpi_get_entity` | `GET /Administration/Entity/{id}` |
| `glpi_list_documents` | `glpi_list_documents` | `GET /Management/Document` |
| `glpi_get_document` | `glpi_get_document` | `GET /Management/Document/{id}` |
| `glpi_get_ticket_stats` | `glpi_get_ticket_stats` | `GET /Assistance/Stat/Ticket/Global` |
| `glpi_get_asset_stats` | `glpi_list_assets_global` | `GET /Assets/Global` |
| `glpi_get_session_info` | `glpi_get_session_info` | `GET /session` |
| `glpi_list_plugin_tags` | Removed | No v3 Tags route |
| `glpi_search_plugin_tag_items` | Removed | No v3 Tags route |
| `glpi_search` | `glpi_search` | Selected supported collection route |

## New v3 tools

The catalog also adds typed solution, team member, and timeline operations for tickets, problems, and changes, plus `glpi_list_assets_global`. These expose native v3 concepts that were absent or overloaded in the old tool surface.
