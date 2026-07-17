import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCachedGiphySearch,
  GiphySearchError,
  normalizeGiphyResult,
  searchGiphy,
} from '../giphy-search.mjs';

test('normalizes a GIPHY result into preview and Discord artwork URLs', () => {
  const result = normalizeGiphyResult({
    id: 'gif-1',
    title: 'Lo-fi cat',
    url: 'https://giphy.com/gifs/gif-1',
    images: {
      original: { url: 'https://media.giphy.com/original.gif', width: '640', height: '480' },
      fixed_width_small: { webp: 'https://media.giphy.com/preview.webp' },
    },
  });

  assert.deepEqual(result, {
    id: 'gif-1',
    title: 'Lo-fi cat',
    previewUrl: 'https://media.giphy.com/preview.webp',
    originalUrl: 'https://media.giphy.com/original.gif',
    pageUrl: 'https://giphy.com/gifs/gif-1',
    width: 640,
    height: 480,
  });
  assert.equal(normalizeGiphyResult({ id: 'unsafe', images: { original: { url: 'http://example.com/a.gif' } } }), null);
});

test('searches GIPHY with bounded safe parameters and normalized results', async () => {
  let requestedUrl;
  const result = await searchGiphy({
    apiKey: 'local-test-key',
    query: '  focus mode  ',
    limit: 99,
    offset: 123,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            id: 'focus-1',
            title: 'Focus mode',
            url: 'https://giphy.com/gifs/focus-1',
            images: {
              original: { url: 'https://media.giphy.com/focus.gif', width: '320', height: '320' },
              fixed_width: { webp: 'https://media.giphy.com/focus.webp' },
            },
          }],
          meta: { status: 200 },
          pagination: { total_count: 200, count: 24, offset: 123 },
        }),
      };
    },
  });

  assert.equal(requestedUrl.origin, 'https://api.giphy.com');
  assert.equal(requestedUrl.searchParams.get('api_key'), 'local-test-key');
  assert.equal(requestedUrl.searchParams.get('q'), 'focus mode');
  assert.equal(requestedUrl.searchParams.get('limit'), '24');
  assert.equal(requestedUrl.searchParams.get('offset'), '123');
  assert.equal(requestedUrl.searchParams.get('rating'), 'pg-13');
  assert.equal(result.provider, 'giphy');
  assert.equal(result.mode, 'search');
  assert.equal(result.items[0].originalUrl, 'https://media.giphy.com/focus.gif');
  assert.deepEqual(result.pagination, {
    offset: 123,
    count: 24,
    totalCount: 200,
    nextOffset: 147,
    hasMore: true,
  });
});

test('loads a paginated trending feed when the query is idle', async () => {
  let requestedUrl;
  const result = await searchGiphy({
    apiKey: 'local-test-key',
    query: '',
    limit: 16,
    offset: 32,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
          meta: { status: 200 },
          pagination: { total_count: 80, count: 16, offset: 32 },
        }),
      };
    },
  });

  assert.equal(requestedUrl.pathname, '/v1/gifs/trending');
  assert.equal(requestedUrl.searchParams.has('q'), false);
  assert.equal(requestedUrl.searchParams.get('offset'), '32');
  assert.equal(result.mode, 'trending');
  assert.equal(result.query, '');
  assert.equal(result.pagination.nextOffset, 48);
  assert.equal(result.pagination.hasMore, true);
});

test('reports missing and rejected GIPHY API keys clearly', async () => {
  await assert.rejects(
    searchGiphy({ query: 'cat' }),
    (error) => error instanceof GiphySearchError
      && error.statusCode === 503
      && error.code === 'GIPHY_API_KEY_REQUIRED',
  );

  await assert.rejects(
    searchGiphy({
      apiKey: 'rejected',
      query: 'cat',
      fetchImpl: async () => ({ ok: false, status: 403 }),
    }),
    (error) => error.statusCode === 401
      && error.code === 'GIPHY_API_KEY_INVALID'
      && /GIPHY API key was rejected/.test(error.message)
      && !/settings/i.test(error.message),
  );
});

test('caches repeated searches to protect the shared free-key quota', async () => {
  let requestCount = 0;
  let clock = 1_000;
  const search = createCachedGiphySearch({
    apiKey: 'local-test-key',
    cacheTtlMs: 500,
    now: () => clock,
    fetchImpl: async () => {
      requestCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [], meta: { status: 200 } }),
      };
    },
  });

  const first = await search({ query: 'Focus', limit: 16 });
  const repeated = await search({ query: 'focus', limit: 16 });
  assert.equal(first, repeated);
  assert.equal(requestCount, 1);

  await search({ query: 'focus', limit: 16, offset: 16 });
  assert.equal(requestCount, 2);

  clock += 501;
  await search({ query: 'focus', limit: 16 });
  assert.equal(requestCount, 3);
});
