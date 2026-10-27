# Candidate GLPI 12 API v3 tools

Reviewed 2026-10-27 against this instance's [versioned OpenAPI document](https://helpdesk.penic.net/api.php/v3/doc.json) and the 90-tool catalog in `src/tool-catalog.ts`. The document publishes 1,181 paths, many of which repeat one relationship across asset types. This list selects distinct workflows rather than treating every path as a useful MCP tool. These are **proposals**, not implemented or live-verified tools.

Route notation: `{AssistanceType}` means one of the published `Ticket`, `Change`, or `Problem` routes; `{AssetType}` means an explicitly supported asset type. Each proposed tool must use an enum or fixed route mapping, not an arbitrary path supplied by a caller. Inputs and outputs should follow the operation's v3 OpenAPI schema and GLPI permissions.

## Priority 1: complete common workflows

| Proposed tools or extension | Published v3 operations | Why add it |
| --- | --- | --- |
| `glpi_get_followup`, `glpi_update_followup`, `glpi_delete_followup`; equivalent task and solution tools | `GET/PATCH/DELETE /Assistance/{AssistanceType}/{id}/Timeline/{Followup|Task|Solution}/{subitem_id}` | Existing tools create and list these items but cannot correct or remove one. |
| `glpi_list_ticket_validations`, `glpi_request_ticket_validation`, `glpi_update_ticket_validation`; Change equivalents | `GET/POST /Assistance/{Ticket|Change}/{id}/Timeline/Validation`; `GET/PATCH/DELETE .../Validation/{subitem_id}` | Approval requests and decisions are core service desk actions. |
| `glpi_list_project_tasks`, `glpi_get_project_task`, `glpi_create_project_task`, `glpi_update_project_task`, `glpi_delete_project_task` | `GET/POST /Project/Task`; `GET/PATCH/DELETE /Project/Task/{id}`; `GET/POST /Project/{project_id}/Task` | The current project tools cannot manage work inside a project. |
| `glpi_list_project_tickets`, `glpi_link_project_ticket`, `glpi_unlink_project_ticket`; Change and Problem equivalents | `GET/POST /Project/{project_id}/{Ticket|Change|Problem}`; `DELETE /Project/{project_id}/{Ticket|Change|Problem}/{ticket_id|change_id|problem_id}` | Connect project work to assistance records. |
| Extend existing Software, Network Equipment, Printer, Monitor, and Phone tools with missing create/update/delete operations | `POST /Assets/{Software|NetworkEquipment|Printer|Monitor|Phone}`; `PATCH/DELETE /Assets/{...}/{id}` | Several current asset types are read-only despite published write routes. Software has create but lacks update and delete. |
| `glpi_update_knowbase_item`, `glpi_delete_knowbase_item`, `glpi_list_knowbase_comments`, `glpi_add_knowbase_comment` | `PATCH/DELETE /Knowledgebase/Article/{article_id}`; `GET/POST /Knowledgebase/Article/{article_id}/Comment` | Complete article maintenance and feedback. |
| `glpi_list_dropdown_values` and `glpi_get_dropdown_value` with a finite `kind` enum | `GET /Dropdowns/{kind}` and `GET /Dropdowns/{kind}/{id}`; first kinds: `State`, `Manufacturer`, `ComputerType`, `ComputerModel`, `RequestType`, `TaskCategory`, `SolutionType`, `ProjectType`, `ProjectTaskType` | Agents need valid IDs and names before creating or editing records. Only ITIL categories and locations are currently exposed. |
| `glpi_get_change_stats`, `glpi_get_problem_stats`, and characteristic statistics for all three assistance types | `GET /Assistance/Stat/{Ticket|Change|Problem}/{Global|Characteristics}` | Extend server-calculated reporting beyond ticket global totals. |

## Priority 2: deepen asset and service management

| Proposed tools or extension | Published v3 operations | Why add it |
| --- | --- | --- |
| `glpi_list_assistance_costs`, `glpi_add_assistance_cost`, `glpi_update_assistance_cost`, `glpi_delete_assistance_cost` | `GET/POST /Assistance/{AssistanceType}/{id}/Cost`; `GET/PATCH/DELETE .../Cost/{cost_id}` | Track time and money associated with tickets, changes, and problems. |
| `glpi_list_recurring_tickets`, `glpi_create_recurring_ticket`, `glpi_update_recurring_ticket`; Change equivalents | `GET/POST /Assistance/Recurring{Ticket|Change}`; `GET/PATCH/DELETE .../{id}` | Manage repeating service work. |
| `glpi_list_computer_software_installations`, `glpi_add_computer_software_installation`, plus virtual machine, antivirus, and volume tools | `GET/POST /Assets/Computer/{asset_id}/{SoftwareInstallation|VirtualMachine|Antivirus|Volume}`; `GET/PATCH/DELETE .../{id}` | Expose inventory relationships that a bare computer record does not show. |
| Asset tools for `Peripheral`, `SoftwareLicense`, `Certificate`, `Rack`, `PDU`, `DCRoom`, and `Unmanaged` | `GET/POST /Assets/{AssetType}`; `GET/PATCH/DELETE /Assets/{AssetType}/{id}` | Fill high-value inventory gaps. Start with types actually used in the target GLPI instance. |
| `glpi_list_asset_contracts`, `glpi_link_asset_contract`, `glpi_unlink_asset_contract` | `GET/POST /Assets/{AssetType}/{asset_id}/Contract`; `DELETE /Assets/{AssetType}/{asset_id}/Contract/{id}` | Answer coverage and renewal questions from asset context. |
| `glpi_list_ticket_documents`, `glpi_attach_ticket_document`, `glpi_download_document` | `GET/POST /Assistance/Ticket/{id}/Timeline/Document`; `GET /Management/Document/{id}/Download` | Make attachments usable. Download requires binary response handling beyond the current JSON transport. |
| Extend Contract and Supplier tools with update/delete; add Budget, License, and Contact CRUD | `PATCH/DELETE /Management/{Contract|Supplier}/{id}`; `GET/POST /Management/{Budget|License|Contact}`; `GET/PATCH/DELETE .../{id}` | Complete purchasing, entitlement, and vendor workflows. |
| Extend User, Group, and Entity tools with update/delete; add Profile reads | `PATCH/DELETE /Administration/{User|Group|Entity}/{id}`; `GET /Administration/Profile` and `GET /Administration/Profile/{id}` | Complete account and organizational administration, subject to GLPI rights. |
| `glpi_get_my_profile`, `glpi_get_my_preferences`, `glpi_update_my_preferences` | `GET /Administration/User/Me`; `GET/PATCH /Administration/User/Me/Preference` | Give an agent user-specific context and controlled preferences. |
| `glpi_list_knowbase_revisions`, `glpi_get_knowbase_revision` | `GET /Knowledgebase/Article/{article_id}/Revision`; `GET /Knowledgebase/Article/{article_id}/Revision/{revision}` | Inspect article history before editing. |

## Priority 3: specialist administration

| Proposed tools or extension | Published v3 operations | Why add it |
| --- | --- | --- |
| `glpi_list_inventory_agents`, `glpi_get_inventory_agent`, `glpi_request_inventory` | `GET /Inventory/Agent`; `GET /Inventory/Agent/{id}`; `POST /Inventory/Agent/{id}/InventoryRequest` | Diagnose stale inventory and request fresh data. |
| `glpi_list_webhooks`, `glpi_get_webhook`, `glpi_list_queued_notifications` | `GET /Setup/Webhook`; `GET /Setup/Webhook/{id}`; `GET /Notifications/QueuedNotification` | Inspect automation and delivery issues. Mutations should follow separate rights and safety review. |
| `glpi_list_rule_collections`, `glpi_list_rules`, `glpi_get_rule` | `GET /Rule/Collection`; `GET /Rule/Collection/{collection}/Rule`; `GET /Rule/Collection/{collection}/Rule/{id}` for published collections | Explain ticket and asset automation outcomes. Start read-only because rule changes have broad effects. |
| `glpi_list_asset_components`, `glpi_get_component` | `GET /Assets/Computer/{id}/Component/{component}`; `GET /Components/{component}/{id}` for published component types | Inspect hardware detail such as memory, disks, processors, and network cards. |
| `glpi_list_my_login_sessions` | `GET /Security/LoginSession/My` | Help users inspect active sessions without exposing all-user administration. |

## Before implementation

1. Check request bodies and response schemas for each exact route. Some route families return timeline wrappers (`{type, item}`) even where the published array schema suggests direct items.
2. Add explicit finite enums for polymorphic route families and schema-specific MCP arguments. Avoid forwarding arbitrary URLs or item types.
3. Test reads and controlled writes against dedicated records for each new domain, then clean them up. Test permission failures and entity scope.
4. Extend the transport for `application/octet-stream` before adding document downloads. Keep binary content out of ordinary JSON tool responses.
5. Update `README.md`, `CHANGELOG.md`, and `docs/migration-log.md` as groups ship. The current OpenAPI document has no Tags route, so Tags remain out of scope.
