#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourceTemplatesRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { GlpiClient, GlpiConfig } from './glpi-client.js';
import { toolCatalog } from './tool-catalog.js';
import { expansionCatalog } from './tool-expansion.js';
import { resolveToolPath, queryFromArgs, sanitizeToolResult } from './tool-router.js';

function configFromEnvironment(): GlpiConfig {
  const names = ['GLPI_URL', 'GLPI_OAUTH_CLIENT_ID', 'GLPI_OAUTH_CLIENT_SECRET', 'GLPI_USERNAME', 'GLPI_PASSWORD'] as const;
  for (const name of names) if (!process.env[name]) throw new Error(`${name} environment variable is required`);
  return {
    url: process.env.GLPI_URL!, clientId: process.env.GLPI_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GLPI_OAUTH_CLIENT_SECRET!, username: process.env.GLPI_USERNAME!, password: process.env.GLPI_PASSWORD!,
  };
}

const server = new Server({ name: 'mcp-glpi', version: '3.1.0' }, { capabilities: { tools: {}, resources: {} } });
const allTools = [...toolCatalog, ...expansionCatalog];
const client = new GlpiClient(configFromEnvironment());
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const tool = allTools.find((candidate) => candidate.name === params.name);
  if (!tool) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${params.name}`);
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  for (const required of tool.inputSchema.required as string[]) {
    if (args[required] === undefined) throw new McpError(ErrorCode.InvalidParams, `${required} is required`);
  }
  const path = resolveToolPath(tool, args);
  const query = queryFromArgs(args);
  if (tool.name === 'glpi_download_document') {
    const uri = `glpi://document/${args.id}/content`;
    return { content: [{ type: 'resource_link', uri, name: `GLPI document ${args.id}`, mimeType: 'application/octet-stream' }] };
  }
  try {
    const result = await client.request(tool.method, path, {
      query, body: args.data,
      entityId: args.entity_id as number | undefined,
      profileId: args.profile_id as number | undefined,
      entityRecursive: args.entity_recursive as boolean | undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify(sanitizeToolResult(tool.name, result)) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
});


server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [{ name: 'GLPI document content', uriTemplate: 'glpi://document/{id}/content', description: 'Authenticated document download (maximum 10 MiB)' }],
}));
server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
  const match = /^glpi:\/\/document\/([1-9]\d*)\/content$/.exec(params.uri);
  if (!match) throw new McpError(ErrorCode.InvalidRequest, 'Unknown GLPI resource URI');
  const document = await client.requestBinary(`/Management/Document/${match[1]}/Download`);
  return { contents: [{ uri: params.uri, mimeType: document.mimeType, blob: document.data.toString('base64') }] };
});

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('MCP GLPI v3 server running on stdio');
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
