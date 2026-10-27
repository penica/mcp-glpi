import schemas from './v3-schemas.json';
import type { HttpMethod, ToolDefinition } from './tool-catalog.js';

const writable = schemas as Record<string, Record<string, unknown>>;
const integer = { type: 'integer', minimum: 1 };
const page = {
  filter: { type: 'string', description: 'RSQL expression using v3 property names' },
  start: { type: 'integer', minimum: 0, default: 0 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
  sort: { type: 'string', description: 'property:asc or property:desc' },
};
const scope = {
  entity_id: { type: 'integer', minimum: 0 },
  profile_id: integer,
  entity_recursive: { type: 'boolean' },
};
const choice = (values: readonly string[]) => ({ type: 'string', enum: values });
const tools: ToolDefinition[] = [];
function add(name: string, method: HttpMethod, path: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  tools.push({ name, method, path, description, inputSchema: { type: 'object', properties: { ...properties, ...scope }, required, additionalProperties: false } });
}
function crud(one: string, many: string, path: string, schema: string, actions: readonly string[] = ['list', 'get', 'create', 'update', 'delete']) {
  if (actions.includes('list')) add(`glpi_list_${many}`, 'GET', path, `List ${many}`, page);
  if (actions.includes('get')) add(`glpi_get_${one}`, 'GET', `${path}/{id}`, `Get ${one}`, { id: integer }, ['id']);
  if (actions.includes('create')) add(`glpi_create_${one}`, 'POST', path, `Create ${one}`, { data: writable[schema] }, ['data']);
  if (actions.includes('update')) add(`glpi_update_${one}`, 'PATCH', `${path}/{id}`, `Update ${one}`, { id: integer, data: writable[schema] }, ['id', 'data']);
  if (actions.includes('delete')) add(`glpi_delete_${one}`, 'DELETE', `${path}/{id}`, `Delete ${one}`, { id: integer, force: { type: 'boolean' } }, ['id']);
}

// Assistance timeline items and approvals.
for (const [kind, title, taskSchema] of [
  ['ticket', 'Ticket', 'TicketTask'], ['change', 'Change', 'ChangeTask'], ['problem', 'Problem', 'ProblemTask'],
] as const) {
  for (const [part, schema] of [['followup', 'Followup'], ['task', taskSchema], ['solution', 'Solution']] as const) {
    const route = `/Assistance/${title}/{id}/Timeline/${part[0].toUpperCase()}${part.slice(1)}/{subitem_id}`;
    add(`glpi_get_${kind}_${part}`, 'GET', route, `Get ${kind} ${part}`, { id: integer, subitem_id: integer }, ['id', 'subitem_id']);
    add(`glpi_update_${kind}_${part}`, 'PATCH', route, `Update ${kind} ${part}`, { id: integer, subitem_id: integer, data: writable[schema] }, ['id', 'subitem_id', 'data']);
    add(`glpi_delete_${kind}_${part}`, 'DELETE', route, `Delete ${kind} ${part}`, { id: integer, subitem_id: integer, force: { type: 'boolean' } }, ['id', 'subitem_id']);
  }
  const costRoute = `/Assistance/${title}/{id}/Cost`;
  const costSchema = `${title}Cost`;
  add(`glpi_list_${kind}_costs`, 'GET', costRoute, `List ${kind} costs`, { id: integer, ...page }, ['id']);
  add(`glpi_add_${kind}_cost`, 'POST', costRoute, `Add ${kind} cost`, { id: integer, data: writable[costSchema] }, ['id', 'data']);
  add(`glpi_get_${kind}_cost`, 'GET', `${costRoute}/{cost_id}`, `Get ${kind} cost`, { id: integer, cost_id: integer }, ['id', 'cost_id']);
  add(`glpi_update_${kind}_cost`, 'PATCH', `${costRoute}/{cost_id}`, `Update ${kind} cost`, { id: integer, cost_id: integer, data: writable[costSchema] }, ['id', 'cost_id', 'data']);
  add(`glpi_delete_${kind}_cost`, 'DELETE', `${costRoute}/{cost_id}`, `Delete ${kind} cost`, { id: integer, cost_id: integer, force: { type: 'boolean' } }, ['id', 'cost_id']);
  add(`glpi_get_${kind}_characteristic_stats`, 'GET', `/Assistance/Stat/${title}/Characteristics`, `Get ${kind} characteristic statistics`, { field: { type: 'string', minLength: 1 }, date_start: { type: 'string', format: 'date' }, date_end: { type: 'string', format: 'date' } }, ['field']);
  if (kind !== 'ticket') add(`glpi_get_${kind}_stats`, 'GET', `/Assistance/Stat/${title}/Global`, `Get ${kind} global statistics`);
}
for (const [kind, title] of [['ticket', 'Ticket'], ['change', 'Change']] as const) {
  const root = `/Assistance/${title}/{id}/Timeline/Validation`;
  add(`glpi_list_${kind}_validations`, 'GET', root, `List ${kind} validations`, { id: integer }, ['id']);
  add(`glpi_request_${kind}_validation`, 'POST', root, `Request ${kind} validation`, { id: integer, data: writable[`${title}Validation`] }, ['id', 'data']);
  for (const [verb, method] of [['get', 'GET'], ['update', 'PATCH'], ['delete', 'DELETE']] as const) {
    const props: Record<string, unknown> = { id: integer, subitem_id: integer };
    if (method === 'PATCH') props.data = writable[`${title}Validation`];
    if (method === 'DELETE') props.force = { type: 'boolean' };
    add(`glpi_${verb}_${kind}_validation`, method, `${root}/{subitem_id}`, `${verb} ${kind} validation`, props, method === 'PATCH' ? ['id', 'subitem_id', 'data'] : ['id', 'subitem_id']);
  }
  crud(`recurring_${kind}`, `recurring_${kind}s`, `/Assistance/Recurring${title}`, `Recurring${title}`);
}

// Project tasks and association links.
crud('project_task', 'project_tasks', '/Project/Task', 'ProjectTask');
add('glpi_list_project_child_tasks', 'GET', '/Project/{project_id}/Task', 'List tasks for a project', { project_id: integer, ...page }, ['project_id']);
add('glpi_create_project_child_task', 'POST', '/Project/{project_id}/Task', 'Create a task in a project', { project_id: integer, data: writable.ProjectTask }, ['project_id', 'data']);
const projectItemTypes = ['Ticket', 'Change', 'Problem'] as const;
add('glpi_list_project_items', 'GET', '/Project/{project_id}/{item_type}', 'List linked assistance items', { project_id: integer, item_type: choice(projectItemTypes), ...page }, ['project_id', 'item_type']);
add('glpi_link_project_item', 'POST', '/Project/{project_id}/{item_type}', 'Link an assistance item to a project', { project_id: integer, item_type: choice(projectItemTypes), data: writable.ITIL_Project }, ['project_id', 'item_type', 'data']);
add('glpi_unlink_project_item', 'DELETE', '/Project/{project_id}/{item_type}/{item_id}', 'Unlink an assistance item from a project', { project_id: integer, item_type: choice(projectItemTypes), item_id: integer }, ['project_id', 'item_type', 'item_id']);

// Existing asset types with missing writes.
crud('software', 'softwares', '/Assets/Software', 'Software', ['update', 'delete']);
for (const [one, many, title] of [
  ['network_equipment', 'network_equipments', 'NetworkEquipment'], ['printer', 'printers', 'Printer'],
  ['monitor', 'monitors', 'Monitor'], ['phone', 'phones', 'Phone'],
] as const) crud(one, many, `/Assets/${title}`, title, ['create', 'update', 'delete']);
for (const [one, many, title] of [
  ['peripheral', 'peripherals', 'Peripheral'], ['certificate', 'certificates', 'Certificate'],
  ['rack', 'racks', 'Rack'], ['pdu', 'pdus', 'PDU'], ['unmanaged_asset', 'unmanaged_assets', 'Unmanaged'],
] as const) crud(one, many, `/Assets/${title}`, title);
for (const [one, many, title] of [
  ['software_installation', 'software_installations', 'SoftwareInstallation'],
  ['virtual_machine', 'virtual_machines', 'VirtualMachine'], ['antivirus', 'antiviruses', 'Antivirus'],
  ['volume', 'volumes', 'Volume'],
] as const) {
  const root = `/Assets/Computer/{asset_id}/${title}`;
  add(`glpi_list_computer_${many}`, 'GET', root, `List computer ${many}`, { asset_id: integer, ...page }, ['asset_id']);
  add(`glpi_add_computer_${one}`, 'POST', root, `Add computer ${one}`, { asset_id: integer, data: writable[title] }, ['asset_id', 'data']);
  add(`glpi_get_computer_${one}`, 'GET', `${root}/{id}`, `Get computer ${one}`, { asset_id: integer, id: integer }, ['asset_id', 'id']);
  add(`glpi_update_computer_${one}`, 'PATCH', `${root}/{id}`, `Update computer ${one}`, { asset_id: integer, id: integer, data: writable[title] }, ['asset_id', 'id', 'data']);
  add(`glpi_delete_computer_${one}`, 'DELETE', `${root}/{id}`, `Delete computer ${one}`, { asset_id: integer, id: integer, force: { type: 'boolean' } }, ['asset_id', 'id']);
}
const contractAssetTypes = ['Computer', 'Monitor', 'NetworkEquipment', 'Peripheral', 'Phone', 'Printer', 'Software', 'Certificate', 'DCRoom', 'Rack', 'Enclosure', 'PDU', 'Appliance'] as const;
const contractRoot = '/Assets/{asset_type}/{asset_id}/Contract';
add('glpi_list_asset_contracts', 'GET', contractRoot, 'List contracts linked to an asset', { asset_type: choice(contractAssetTypes), asset_id: integer, ...page }, ['asset_type', 'asset_id']);
add('glpi_link_asset_contract', 'POST', contractRoot, 'Link a contract to an asset', { asset_type: choice(contractAssetTypes), asset_id: integer, data: writable.Contract_Item }, ['asset_type', 'asset_id', 'data']);
add('glpi_unlink_asset_contract', 'DELETE', `${contractRoot}/{id}`, 'Unlink a contract from an asset', { asset_type: choice(contractAssetTypes), asset_id: integer, id: integer }, ['asset_type', 'asset_id', 'id']);

// Knowledge base, dropdowns, and documents.
add('glpi_update_knowbase_item', 'PATCH', '/Knowledgebase/Article/{article_id}', 'Update knowledge base article', { article_id: integer, data: writable.KBArticle }, ['article_id', 'data']);
add('glpi_delete_knowbase_item', 'DELETE', '/Knowledgebase/Article/{article_id}', 'Delete knowledge base article', { article_id: integer, force: { type: 'boolean' } }, ['article_id']);
const commentRoot = '/Knowledgebase/Article/{article_id}/Comment';
add('glpi_list_knowbase_comments', 'GET', commentRoot, 'List article comments', { article_id: integer, ...page }, ['article_id']);
add('glpi_add_knowbase_comment', 'POST', commentRoot, 'Add article comment', { article_id: integer, data: writable.KBArticleComment }, ['article_id', 'data']);
add('glpi_list_knowbase_revisions', 'GET', '/Knowledgebase/Article/{article_id}/Revision', 'List article revisions', { article_id: integer, ...page }, ['article_id']);
add('glpi_get_knowbase_revision', 'GET', '/Knowledgebase/Article/{article_id}/Revision/{revision}', 'Get article revision', { article_id: integer, revision: integer, language: { type: 'string' } }, ['article_id', 'revision']);
const dropdownKinds = ['State', 'Manufacturer', 'ComputerType', 'ComputerModel', 'RequestType', 'TaskCategory', 'SolutionType', 'ProjectType', 'ProjectTaskType'] as const;
add('glpi_list_dropdown_values', 'GET', '/Dropdowns/{kind}', 'List values for a supported dropdown', { kind: choice(dropdownKinds), ...page }, ['kind']);
add('glpi_get_dropdown_value', 'GET', '/Dropdowns/{kind}/{id}', 'Get a supported dropdown value', { kind: choice(dropdownKinds), id: integer }, ['kind', 'id']);
add('glpi_list_ticket_documents', 'GET', '/Assistance/Ticket/{id}/Timeline/Document', 'List ticket documents', { id: integer }, ['id']);
add('glpi_attach_ticket_document', 'POST', '/Assistance/Ticket/{id}/Timeline/Document', 'Attach an existing document to a ticket', { id: integer, data: writable.Document_Item }, ['id', 'data']);
add('glpi_download_document', 'GET', '/Management/Document/{id}/Download', 'Get an MCP resource link for document content', { id: integer }, ['id']);

// Management and administration.
crud('contract', 'contracts', '/Management/Contract', 'Contract', ['update', 'delete']);
crud('supplier', 'suppliers', '/Management/Supplier', 'Supplier', ['update', 'delete']);
for (const [one, many, title] of [['budget', 'budgets', 'Budget'], ['license', 'licenses', 'License'], ['contact', 'contacts', 'Contact']] as const) {
  crud(one, many, `/Management/${title}`, title);
}
for (const [one, many, title] of [['user', 'users', 'User'], ['group', 'groups', 'Group'], ['entity', 'entities', 'Entity']] as const) {
  crud(one, many, `/Administration/${title}`, title, ['update', 'delete']);
}
add('glpi_list_profiles', 'GET', '/Administration/Profile', 'List profiles', page);
add('glpi_get_profile', 'GET', '/Administration/Profile/{id}', 'Get profile', { id: integer }, ['id']);
add('glpi_get_my_profile', 'GET', '/Administration/User/Me', 'Get current user');
add('glpi_get_my_preferences', 'GET', '/Administration/User/Me/Preference', 'Get current user preferences');
add('glpi_update_my_preferences', 'PATCH', '/Administration/User/Me/Preference', 'Update current user preferences', { data: writable.UserPreferences }, ['data']);

// Specialist reads and one controlled inventory command.
add('glpi_list_inventory_agents', 'GET', '/Inventory/Agent', 'List inventory agents', page);
add('glpi_get_inventory_agent', 'GET', '/Inventory/Agent/{id}', 'Get inventory agent', { id: integer }, ['id']);
add('glpi_request_inventory', 'POST', '/Inventory/Agent/{id}/InventoryRequest', 'Request inventory from an agent', { id: integer }, ['id']);
add('glpi_list_webhooks', 'GET', '/Setup/Webhook', 'List webhooks', page);
add('glpi_get_webhook', 'GET', '/Setup/Webhook/{id}', 'Get webhook', { id: integer }, ['id']);
add('glpi_list_queued_notifications', 'GET', '/Notifications/QueuedNotification', 'List queued notifications', page);
add('glpi_list_rule_collections', 'GET', '/Rule/Collection', 'List rule collections');
const ruleCollections = ['DefineItemtype', 'ImportAsset', 'ImportEntity', 'Location', 'MailCollector', 'Right', 'SoftwareCategory', 'Ticket', 'Change', 'Problem', 'Asset'] as const;
add('glpi_list_rules', 'GET', '/Rule/Collection/{collection}/Rule', 'List rules in a collection', { collection: choice(ruleCollections), ...page }, ['collection']);
add('glpi_get_rule', 'GET', '/Rule/Collection/{collection}/Rule/{id}', 'Get a rule', { collection: choice(ruleCollections), id: integer }, ['collection', 'id']);
const components = ['Battery', 'Camera', 'Case', 'Controller', 'Drive', 'Firmware', 'GenericDevice', 'GraphicCard', 'HardDrive', 'Memory', 'NetworkCard', 'PCIDevice', 'PowerSupply', 'Processor', 'Sensor', 'SIMCard', 'SoundCard', 'Systemboard'] as const;
add('glpi_list_computer_components', 'GET', '/Assets/Computer/{id}/Component/{component}', 'List computer components of a type', { id: integer, component: choice(components) }, ['id', 'component']);
add('glpi_get_component', 'GET', '/Components/{component}/{id}', 'Get a hardware component', { component: choice(components), id: integer }, ['component', 'id']);
add('glpi_list_my_login_sessions', 'GET', '/Security/LoginSession/My', 'List current user login sessions', page);

export const expansionCatalog = tools;
