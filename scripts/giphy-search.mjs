const GIPHY_SEARCH_ENDPOINT = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING_ENDPOINT = 'https://api.giphy.com/v1/gifs/trending';

export class GiphySearchError extends Error {
  constructor(message, statusCode = 502, code = 'GIPHY_SEARCH_FAILED') {
    super(message);
    this.name = 'GiphySearchError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function text(value) {
  return String(value ?? '').trim();
}

function httpsUrl(value) {
  const candidate = text(value);
  return candidate.startsWith('https://') ? candidate : '';
}

export function normalizeGiphyResult(item) {
  const images = item?.images || {};
  const originalUrl = httpsUrl(images.original?.url)
    || httpsUrl(images.downsized_medium?.url)
    || httpsUrl(images.downsized?.url);
  if (!item?.id || !originalUrl) return null;

  const previewUrl = httpsUrl(images.fixed_width_small?.webp)
    || httpsUrl(images.fixed_width?.webp)
    || httpsUrl(images.fixed_width?.url)
    || httpsUrl(images.downsized?.url)
    || originalUrl;

  return {
    id: text(item.id),
    title: text(item.title) || 'Untitled GIF',
    previewUrl,
    originalUrl,
    pageUrl: httpsUrl(item.url),
    width: Number(images.original?.width || 0) || null,
    height: Number(images.original?.height || 0) || null,
  };
}

export async function searchGiphy({
  apiKey,
  query,
  limit = 12,
  offset = 0,
  fetchImpl = globalThis.fetch,
} = {}) {
  const key = text(apiKey);
  const searchTerm = text(query);
  const resultLimit = Math.min(24, Math.max(1, Number(limit) || 12));
  const resultOffset = Math.min(4_999, Math.max(0, Math.floor(Number(offset) || 0)));

  if (!key) {
    throw new GiphySearchError(
      'Add a GIPHY API key before searching for GIFs.',
      503,
      'GIPHY_API_KEY_REQUIRED',
    );
  }
  if (searchTerm.length > 80) {
    throw new GiphySearchError(
      'GIF search cannot exceed 80 characters.',
      400,
      'GIPHY_QUERY_INVALID',
    );
  }
  if (typeof fetchImpl !== 'function') {
    throw new GiphySearchError('GIF search is unavailable in this runtime.');
  }

  const mode = searchTerm ? 'search' : 'trending';
  const url = new URL(searchTerm ? GIPHY_SEARCH_ENDPOINT : GIPHY_TRENDING_ENDPOINT);
  url.searchParams.set('api_key', key);
  if (searchTerm) url.searchParams.set('q', searchTerm);
  url.searchParams.set('limit', String(resultLimit));
  url.searchParams.set('offset', String(resultOffset));
  url.searchParams.set('rating', 'pg-13');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bundle', 'messaging_non_clips');

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new GiphySearchError('GIPHY took too long to respond. Try again.');
    }
    throw new GiphySearchError('Could not reach GIPHY. Check the internet connection and try again.');
  }

  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      throw new GiphySearchError(
        'The GIPHY API key was rejected. Open API keys in Studio, paste a valid free key, and save.',
        401,
        'GIPHY_API_KEY_INVALID',
      );
    }
    if (response.status === 429) {
      throw new GiphySearchError(
        'The GIPHY search limit was reached. Wait a moment and try again.',
        429,
        'GIPHY_RATE_LIMITED',
      );
    }
    throw new GiphySearchError('GIPHY search failed with HTTP ' + response.status + '.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new GiphySearchError('GIPHY returned an unreadable response.');
  }

  if (Number(payload?.meta?.status || 200) >= 400) {
    throw new GiphySearchError(
      text(payload?.meta?.msg) || 'GIPHY rejected the search request.',
      Number(payload.meta.status) || 502,
    );
  }

  const data = Array.isArray(payload?.data) ? payload.data : [];
  const items = data.map(normalizeGiphyResult).filter(Boolean);
  const providerOffset = Math.max(0, Math.floor(Number(payload?.pagination?.offset) || resultOffset));
  const providerCount = Math.max(0, Math.floor(Number(payload?.pagination?.count) || data.length));
  const totalValue = Number(payload?.pagination?.total_count);
  const totalCount = Number.isFinite(totalValue) && totalValue >= 0
    ? Math.floor(totalValue)
    : null;
  const nextOffsetValue = providerOffset + providerCount;
  const hasMore = providerCount > 0 && (totalCount === null
    ? providerCount >= resultLimit
    : nextOffsetValue < totalCount);

  return {
    provider: 'giphy',
    attribution: 'Powered by GIPHY',
    mode,
    query: searchTerm,
    items,
    pagination: {
      offset: providerOffset,
      count: providerCount,
      totalCount,
      nextOffset: hasMore ? nextOffsetValue : null,
      hasMore,
    },
  };
}

export function createCachedGiphySearch({
  apiKey,
  fetchImpl = globalThis.fetch,
  cacheTtlMs = 5 * 60_000,
  maxEntries = 100,
  now = Date.now,
} = {}) {
  const cache = new Map();

  return async ({ query, limit = 12, offset = 0 } = {}) => {
    const searchTerm = text(query);
    const resultLimit = Math.min(24, Math.max(1, Number(limit) || 12));
    const resultOffset = Math.min(4_999, Math.max(0, Math.floor(Number(offset) || 0)));
    const cacheKey = (searchTerm ? 'search|' : 'trending|')
      + searchTerm.toLocaleLowerCase('en') + '|' + resultLimit + '|' + resultOffset;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.result;
    if (cached) cache.delete(cacheKey);

    const result = await searchGiphy({
      apiKey,
      query: searchTerm,
      limit: resultLimit,
      offset: resultOffset,
      fetchImpl,
    });
    cache.set(cacheKey, { result, expiresAt: now() + cacheTtlMs });

    while (cache.size > maxEntries) {
      cache.delete(cache.keys().next().value);
    }
    return result;
  };
}
