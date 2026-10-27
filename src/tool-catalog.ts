import schemas from './v3-schemas.json';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export interface ToolDefinition {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  inputSchema: Record<string, unknown>;
}

const integer = { type: 'integer', minimum: 1 };
const page = {
  filter: { type: 'string', description: 'RSQL expression using v3 schema property names' },
  start: { type: 'integer', minimum: 0, default: 0 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
  sort: { type: 'string', description: 'property:asc or property:desc' },
};
const scope = {
  entity_id: { type: 'integer', minimum: 0 },
  profile_id: integer,
  entity_recursive: { type: 'boolean' },
};
const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const tools: ToolDefinition[] = [];
function add(name: string, method: HttpMethod, path: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  tools.push({ name, method, path, description, inputSchema: object({ ...properties, ...scope }, required) });
}

function crud(singular: string, plural: string, path: string, schema: keyof typeof schemas, actions: string[] = ['list', 'get', 'create', 'update', 'delete']) {
  if (actions.includes('list')) add(`glpi_list_${plural}`, 'GET', path, `List ${plural} using v3 RSQL filters and pagination`, page);
  if (actions.includes('get')) add(`glpi_get_${singular}`, 'GET', `${path.replace(/\/$/, '')}/{id}`, `Get a ${singular} by ID`, { id: integer }, ['id']);
  if (actions.includes('create')) add(`glpi_create_${singular}`, 'POST', path, `Create a ${singular} using the v3 ${schema} schema`, { data: schemas[schema] }, ['data']);
  if (actions.includes('update')) add(`glpi_update_${singular}`, 'PATCH', `${path.replace(/\/$/, '')}/{id}`, `Update a ${singular} using the v3 ${schema} schema`, { id: integer, data: schemas[schema] }, ['id', 'data']);
  if (actions.includes('delete')) add(`glpi_delete_${singular}`, 'DELETE', `${path.replace(/\/$/, '')}/{id}`, `Delete a ${singular}`, { id: integer, force: { type: 'boolean' } }, ['id']);
}

crud('ticket', 'tickets', '/Assistance/Ticket', 'Ticket');
crud('problem', 'problems', '/Assistance/Problem', 'Problem', ['list', 'get', 'create', 'update']);
crud('change', 'changes', '/Assistance/Change', 'Change', ['list', 'get', 'create', 'update']);
for (const [kind, title, taskSchema] of [
  ['ticket', 'Ticket', 'TicketTask'],
  ['problem', 'Problem', 'ProblemTask'],
  ['change', 'Change', 'ChangeTask'],
] as const) {
  const root = `/Assistance/${title}/{id}`;
  add(`glpi_get_${kind}_timeline`, 'GET', `${root}/Timeline`, `Get the ${kind} timeline`, { id: integer }, ['id']);
  add(`glpi_get_${kind}_followups`, 'GET', `${root}/Timeline/Followup`, `List ${kind} followups`, { id: integer }, ['id']);
  add(kind === 'ticket' ? 'glpi_add_followup' : `glpi_add_${kind}_followup`, 'POST', `${root}/Timeline/Followup`, `Add a ${kind} followup`, { id: integer, data: schemas.Followup }, ['id', 'data']);
  add(`glpi_get_${kind}_tasks`, 'GET', `${root}/Timeline/Task`, `List ${kind} tasks`, { id: integer }, ['id']);
  add(kind === 'ticket' ? 'glpi_add_task' : `glpi_add_${kind}_task`, 'POST', `${root}/Timeline/Task`, `Add a ${kind} task`, { id: integer, data: schemas[taskSchema] }, ['id', 'data']);
  add(`glpi_list_${kind}_solutions`, 'GET', `${root}/Timeline/Solution`, `List ${kind} solutions`, { id: integer }, ['id']);
  if (kind !== 'ticket') add(`glpi_add_${kind}_solution`, 'POST', `${root}/Timeline/Solution`, `Add a ${kind} solution`, { id: integer, data: schemas.Solution }, ['id', 'data']);
  add(`glpi_list_${kind}_team`, 'GET', `${root}/TeamMember`, `List ${kind} team members`, { id: integer }, ['id']);
  add(`glpi_add_${kind}_team_member`, 'POST', `${root}/TeamMember`, `Add a ${kind} team member`, {
    id: integer,
    data: object({ type: { type: 'string', enum: ['User', 'Group', 'Supplier'] }, id: integer, role: { type: 'string', enum: ['requester', 'assigned', 'observer'] } }, ['type', 'id', 'role']),
  }, ['id', 'data']);
}
add('glpi_assign_ticket', 'POST', '/Assistance/Ticket/{id}/TeamMember', 'Assign a user or group to a ticket', {
  id: integer, data: object({ type: { type: 'string', enum: ['User', 'Group'] }, id: integer, role: { type: 'string', enum: ['assigned'] } }, ['type', 'id', 'role']),
}, ['id', 'data']);
add('glpi_add_solution', 'POST', '/Assistance/Ticket/{id}/Timeline/Solution', 'Add a ticket solution', { id: integer, data: schemas.Solution }, ['id', 'data']);

crud('computer', 'computers', '/Assets/Computer', 'Computer');
crud('software', 'softwares', '/Assets/Software', 'Software', ['list', 'get', 'create']);
for (const [one, many, path, schema] of [
  ['network_equipment', 'network_equipments', 'NetworkEquipment', 'NetworkEquipment'],
  ['printer', 'printers', 'Printer', 'Printer'],
  ['monitor', 'monitors', 'Monitor', 'Monitor'],
  ['phone', 'phones', 'Phone', 'Phone'],
] as const) crud(one, many, `/Assets/${path}`, schema, ['list', 'get']);

crud('knowbase_item', 'knowbase', '/Knowledgebase/Article', 'KBArticle', ['list', 'get', 'create']);
tools.find((tool) => tool.name === 'glpi_get_knowbase_item')!.path = '/Knowledgebase/Article/{article_id}';
add('glpi_search_knowbase', 'GET', '/Knowledgebase/Article', 'Search knowledge base articles with a v3 RSQL filter', { ...page, language: { type: 'string' } });
crud('contract', 'contracts', '/Management/Contract', 'Contract', ['list', 'get', 'create']);
crud('supplier', 'suppliers', '/Management/Supplier', 'Supplier', ['list', 'get', 'create']);
crud('location', 'locations', '/Dropdowns/Location', 'Location', ['list', 'get', 'create']);
crud('project', 'projects', '/Project/', 'Project', ['list', 'get', 'create', 'update']);
crud('user', 'users', '/Administration/User', 'User', ['list', 'get', 'create']);
add('glpi_search_user', 'GET', '/Administration/User', 'Search users with a v3 RSQL filter', page);
crud('group', 'groups', '/Administration/Group', 'Group', ['list', 'get', 'create']);
crud('category', 'categories', '/Dropdowns/ITILCategory', 'ITILCategory', ['list']);
crud('entity', 'entities', '/Administration/Entity', 'Entity', ['list', 'get']);
(tools.find((tool) => tool.name === 'glpi_get_entity')!.inputSchema.properties as Record<string, unknown>).id = { type: 'integer', minimum: 0 };
crud('document', 'documents', '/Management/Document', 'Document', ['list', 'get']);
add('glpi_get_ticket_stats', 'GET', '/Assistance/Stat/Ticket/Global', 'Get server-calculated ticket statistics');
add('glpi_list_assets_global', 'GET', '/Assets/Global', 'List assets across types', page);
add('glpi_get_session_info', 'GET', '/session', 'Get the current v3 session');

const searchable = {
  Ticket: '/Assistance/Ticket', Problem: '/Assistance/Problem', Change: '/Assistance/Change',
  Computer: '/Assets/Computer', Software: '/Assets/Software', User: '/Administration/User',
  Group: '/Administration/Group', Contract: '/Management/Contract', Supplier: '/Management/Supplier',
  Project: '/Project/', KBArticle: '/Knowledgebase/Article',
} as const;
add('glpi_search', 'GET', '{search_path}', 'Search a supported v3 collection with an RSQL filter', {
  itemtype: { type: 'string', enum: Object.keys(searchable) }, ...page,
}, ['itemtype']);

export { tools as toolCatalog, searchable };
