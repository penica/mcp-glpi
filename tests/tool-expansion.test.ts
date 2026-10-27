import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import routes from '../src/v3-routes.json';
import originalSchemas from '../scripts/v3-base-schemas.json';
import schemas from '../src/v3-schemas.json';
import { toolCatalog } from '../src/tool-catalog';
import { expansionCatalog } from '../src/tool-expansion';
import { queryFromArgs, resolveToolPath, sanitizeToolResult } from '../src/tool-router';

const allTools = [...toolCatalog, ...expansionCatalog];
const routeMap = routes as Record<string, string[]>;

function pathsFor(tool: typeof allTools[number]): string[] {
  if (tool.path === '{search_path}') return [];
  const params = [...tool.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const properties = tool.inputSchema.properties as Record<string, { enum?: string[] }>;
  let paths = [tool.path];
  for (const param of params) {
    const values = properties[param]?.enum ?? [`{${param}}`];
    paths = paths.flatMap((path) => values.map((value) => path.replace(`{${param}}`, value)));
  }
  return paths;
}

test('all advertised operations match versioned OpenAPI paths and methods', () => {
  const names = allTools.map((tool) => tool.name);
  expect(new Set(names).size).toBe(names.length);
  expect(expansionCatalog.length).toBeGreaterThan(150);
  for (const tool of allTools) {
    for (const path of pathsFor(tool)) {
      const regex = new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '\\{[^/]+\\}')}$`);
      expect(Object.entries(routeMap).some(([route, methods]) => regex.test(route) && methods.includes(tool.method))).toBe(true);
    }
  }
});

test('existing writable schemas remain compatible', () => {
  for (const [name, schema] of Object.entries(originalSchemas)) {
    expect((schemas as Record<string, unknown>)[name]).toEqual(schema);
  }
});

test('new writes advertise data schemas and route enums reject unknown values', () => {
  for (const tool of expansionCatalog) {
    if ((tool.method === 'POST' || tool.method === 'PATCH') && tool.name !== 'glpi_request_inventory') {
      expect((tool.inputSchema.properties as Record<string, unknown>).data).toBeDefined();
    }
  }
  const dropdown = expansionCatalog.find((tool) => tool.name === 'glpi_list_dropdown_values')!;
  expect(resolveToolPath(dropdown, { kind: 'State' })).toBe('/Dropdowns/State');
  expect(() => resolveToolPath(dropdown, { kind: '../Setup' })).toThrow(McpError);
  const link = expansionCatalog.find((tool) => tool.name === 'glpi_unlink_project_item')!;
  expect(resolveToolPath(link, { project_id: 3, item_type: 'Ticket', item_id: 7 })).toBe('/Project/3/Ticket/7');
});

test('path and pagination validation preserve entity zero', () => {
  const entity = toolCatalog.find((tool) => tool.name === 'glpi_get_entity')!;
  expect(resolveToolPath(entity, { id: 0 })).toBe('/Administration/Entity/0');
  const ticket = toolCatalog.find((tool) => tool.name === 'glpi_get_ticket')!;
  expect(() => resolveToolPath(ticket, { id: 0 })).toThrow(McpError);
  expect(queryFromArgs({ start: 0, limit: 100 })).toEqual({ start: 0, limit: 100 });
  try { queryFromArgs({ limit: 101 }); fail('expected error'); } catch (error) {
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
  }
});

test('webhook reads do not expose webhook credentials', () => {
  const input = { items: [{ name: 'test', secret: 'secret-value', clientsecret: 'oauth-secret', nested: { secret: 'nested' } }] };
  expect(sanitizeToolResult('glpi_list_webhooks', input)).toEqual({ items: [{ name: 'test', nested: {} }] });
  expect(input.items[0].secret).toBe('secret-value');
});
