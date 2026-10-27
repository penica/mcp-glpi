import { GlpiClient, GlpiApiError } from '../src/glpi-client';

const config = { url: 'https://glpi.example', clientId: 'client', clientSecret: 'secret', username: 'user', password: 'pass' };
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });
const token = () => new Response(JSON.stringify({ access_token: 'access', expires_in: 3600 }), { status: 200 });

test('downloads binary content with its MIME type', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response(Uint8Array.from([0, 255, 1]), { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
  global.fetch = fetcher;
  const data = await new GlpiClient(config).requestBinary('/Management/Document/7/Download');
  expect(data.data).toEqual(Buffer.from([0, 255, 1]));
  expect(data.mimeType).toBe('application/pdf');
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer access');
});

test('rejects oversized content with and without Content-Length', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response('large', { status: 200, headers: { 'Content-Length': '11' } }));
  await expect(new GlpiClient(config).requestBinary('/Management/Document/7/Download', 10)).rejects.toEqual(new GlpiApiError(413, '/Management/Document/7/Download', 'Document exceeds 10 MiB limit'));
  global.fetch = jest.fn().mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response('large', { status: 200 }));
  await expect(new GlpiClient(config).requestBinary('/Management/Document/7/Download', 3)).rejects.toThrow('exceeds 10 MiB');
});

test('rejects arbitrary resource paths before making a request', async () => {
  const fetcher = jest.fn(); global.fetch = fetcher;
  await expect(new GlpiClient(config).requestBinary('/Setup/Config')).rejects.toThrow('Invalid GLPI document path');
  expect(fetcher).not.toHaveBeenCalled();
});
