#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { GlpiClient, GlpiConfig } from './glpi-client.js';
import { toolCatalog, searchable } from './tool-catalog.js';

function configFromEnvironment(): GlpiConfig {
  const names = ['GLPI_URL', 'GLPI_OAUTH_CLIENT_ID', 'GLPI_OAUTH_CLIENT_SECRET', 'GLPI_USERNAME', 'GLPI_PASSWORD'] as const;
  for (const name of names) if (!process.env[name]) throw new Error(`${name} environment variable is required`);
  return {
    url: process.env.GLPI_URL!, clientId: process.env.GLPI_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GLPI_OAUTH_CLIENT_SECRET!, username: process.env.GLPI_USERNAME!, password: process.env.GLPI_PASSWORD!,
  };
}

const server = new Server({ name: 'mcp-glpi', version: '3.0.0' }, { capabilities: { tools: {} } });
const client = new GlpiClient(configFromEnvironment());
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolCatalog.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const tool = toolCatalog.find((candidate) => candidate.name === params.name);
  if (!tool) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${params.name}`);
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  for (const required of tool.inputSchema.required as string[]) {
    if (args[required] === undefined) throw new McpError(ErrorCode.InvalidParams, `${required} is required`);
  }
  let path = tool.path;
  if (path === '{search_path}') {
    const key = String(args.itemtype) as keyof typeof searchable;
    if (!Object.hasOwn(searchable, key)) throw new McpError(ErrorCode.InvalidParams, 'Unsupported itemtype');
    path = searchable[key];
  }
  path = path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = Number(args[name] ?? (name === 'article_id' ? args.id : undefined));
    if (!Number.isSafeInteger(value) || value < (tool.name === 'glpi_get_entity' ? 0 : 1)) throw new McpError(ErrorCode.InvalidParams, `${name} must be a valid ID`);
    return String(value);
  });
  const query: Record<string, string | number | boolean | undefined> = {};
  for (const key of ['filter', 'sort', 'start', 'limit', 'language', 'force']) {
    if (args[key] !== undefined) query[key] = args[key] as string | number | boolean;
  }
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    throw new McpError(ErrorCode.InvalidParams, 'limit must be an integer between 1 and 100');
  }
  if (query.start !== undefined && (!Number.isInteger(query.start) || Number(query.start) < 0)) {
    throw new McpError(ErrorCode.InvalidParams, 'start must be a nonnegative integer');
  }
  try {
    const result = await client.request(tool.method, path, {
      query, body: args.data,
      entityId: args.entity_id as number | undefined,
      profileId: args.profile_id as number | undefined,
      entityRecursive: args.entity_recursive as boolean | undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
});

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('MCP GLPI v3 server running on stdio');
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
