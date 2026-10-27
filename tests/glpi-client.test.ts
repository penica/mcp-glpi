import { GlpiClient, GlpiApiError } from '../src/glpi-client';
import { toolCatalog } from '../src/tool-catalog';

const config = { url: 'https://glpi.example/', clientId: 'client', clientSecret: 'secret', username: 'user', password: 'pass' };
const originalFetch = global.fetch;
const json = (value: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(value), { status, headers });

afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

test('obtains a password grant and sends a bearer token to pinned v3 routes', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'access', expires_in: 3600 }))
    .mockResolvedValueOnce(json([{ id: 1 }], 200, { 'Content-Range': '2-2/3' }));
  global.fetch = fetcher;
  const result = await new GlpiClient(config).request('GET', '/Assistance/Ticket', {
    query: { filter: 'name=ilike=*test*', start: 2, limit: 1 }, entityId: 4,
  });
  expect(result).toEqual({ items: [{ id: 1 }], total: 3 });
  const [tokenUrl, tokenOptions] = fetcher.mock.calls[0];
  expect(tokenUrl).toBe('https://glpi.example/api.php/token');
  expect(tokenOptions.body).toContain('grant_type=password');
  const [resourceUrl, resourceOptions] = fetcher.mock.calls[1];
  expect(String(resourceUrl)).toContain('/api.php/v3/Assistance/Ticket?filter=name%3Dilike%3D*test*&start=2&limit=1');
  expect(resourceOptions.headers.Authorization).toBe('Bearer access');
  expect(resourceOptions.headers['GLPI-Entity']).toBe('4');
});

test('reuses a live token and reacquires it after a 401', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'first', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ id: 1 }))
    .mockResolvedValueOnce(json({ title: 'Unauthorized' }, 401))
    .mockResolvedValueOnce(json({ access_token: 'second', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ id: 2 }));
  global.fetch = fetcher;
  const client = new GlpiClient(config);
  await client.request('GET', '/Assistance/Ticket/1');
  expect(await client.request('GET', '/Assistance/Ticket/2')).toEqual({ id: 2 });
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(fetcher.mock.calls[4][1].headers.Authorization).toBe('Bearer second');
});

test('maps v3 PATCH bodies without a legacy input wrapper and handles empty responses', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'access', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ id: 7, name: 'Updated' }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  global.fetch = fetcher;
  const client = new GlpiClient(config);
  await client.request('PATCH', '/Assistance/Ticket/7', { body: { name: 'Updated' } });
  expect(fetcher.mock.calls[1][1].body).toBe('{"name":"Updated"}');
  expect(await client.request('DELETE', '/Assistance/Ticket/7')).toEqual({ success: true });
});

test('does not expose OAuth credentials in token errors and reports API permissions', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(json({ error_description: 'secret leaked' }, 401));
  await expect(new GlpiClient(config).request('GET', '/session')).rejects.toThrow('OAuth api scope grant failed');
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'access', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ title: 'Forbidden' }, 403));
  global.fetch = fetcher;
  await expect(new GlpiClient(config).request('GET', '/Administration/User')).rejects.toEqual(
    new GlpiApiError(403, '/Administration/User', 'Forbidden'),
  );
});

test('catalog uses v3 paths and schema properties', () => {
  expect(toolCatalog.find((tool) => tool.name === 'glpi_create_ticket')?.path).toBe('/Assistance/Ticket');
  expect(toolCatalog.find((tool) => tool.name === 'glpi_create_ticket')?.inputSchema.properties).toHaveProperty('data');
  expect(toolCatalog.find((tool) => tool.name === 'glpi_assign_ticket')?.path).toContain('/TeamMember');
  expect(toolCatalog.some((tool) => tool.name.includes('plugin_tag'))).toBe(false);
  expect(toolCatalog.every((tool) => !tool.path.includes('apirest.php'))).toBe(true);
});

test('uses user scope for current-user routes without changing ordinary API tokens', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'user-token', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ id: 7 }))
    .mockResolvedValueOnce(json({ access_token: 'api-token', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ items: [] }));
  global.fetch = fetcher;
  const client = new GlpiClient(config);
  await client.request('GET', '/Administration/User/Me');
  await client.request('GET', '/Administration/User');
  expect(fetcher.mock.calls[0][1].body).toContain('scope=user');
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer user-token');
  expect(fetcher.mock.calls[2][1].body).toContain('scope=api');
  expect(fetcher.mock.calls[3][1].headers.Authorization).toBe('Bearer api-token');
});

test('inventory request sends a scoped POST with no body', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json({ access_token: 'access', expires_in: 3600 }))
    .mockResolvedValueOnce(json({ accepted: true }));
  global.fetch = fetcher;
  const result = await new GlpiClient(config).request('POST', '/Inventory/Agent/8/InventoryRequest');
  expect(result).toEqual({ accepted: true });
  expect(String(fetcher.mock.calls[1][0])).toContain('/api.php/v3/Inventory/Agent/8/InventoryRequest');
  expect(fetcher.mock.calls[1][1].method).toBe('POST');
  expect(fetcher.mock.calls[1][1].body).toBeUndefined();
});
