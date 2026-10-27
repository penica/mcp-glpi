import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition } from './tool-catalog.js';
import { searchable } from './tool-catalog.js';

export function resolveToolPath(tool: ToolDefinition, args: Record<string, unknown>): string {
  let path = tool.path;
  if (path === '{search_path}') {
    const key = String(args.itemtype) as keyof typeof searchable;
    if (!Object.hasOwn(searchable, key)) throw new McpError(ErrorCode.InvalidParams, 'Unsupported itemtype');
    path = searchable[key];
  }
  const properties = tool.inputSchema.properties as Record<string, { type?: string; enum?: string[]; minimum?: number }>;
  return path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const schema = properties[name];
    const raw = args[name] ?? (tool.name === 'glpi_get_knowbase_item' && name === 'article_id' ? args.id : undefined);
    if (schema?.type === 'string' && schema.enum) {
      if (typeof raw !== 'string' || !schema.enum.includes(raw)) throw new McpError(ErrorCode.InvalidParams, `${name} must be a published route value`);
      return encodeURIComponent(raw);
    }
    const value = Number(raw);
    const minimum = schema?.minimum ?? (tool.name === 'glpi_get_entity' ? 0 : 1);
    if (!Number.isSafeInteger(value) || raw === undefined || value < minimum) throw new McpError(ErrorCode.InvalidParams, `${name} must be a valid ID`);
    return String(value);
  });
}

export function queryFromArgs(args: Record<string, unknown>): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  for (const key of ['filter', 'sort', 'start', 'limit', 'language', 'force', 'field', 'date_start', 'date_end']) {
    if (args[key] !== undefined) query[key] = args[key] as string | number | boolean;
  }
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    throw new McpError(ErrorCode.InvalidParams, 'limit must be an integer between 1 and 100');
  }
  if (query.start !== undefined && (!Number.isInteger(query.start) || Number(query.start) < 0)) {
    throw new McpError(ErrorCode.InvalidParams, 'start must be a nonnegative integer');
  }
  return query;
}

export function sanitizeToolResult(name: string, result: unknown): unknown {
  if (name !== 'glpi_list_webhooks' && name !== 'glpi_get_webhook') return result;
  const scrub = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'secret' && key !== 'clientsecret').map(([key, item]) => [key, scrub(item)]));
    }
    return value;
  };
  return scrub(result);
}
