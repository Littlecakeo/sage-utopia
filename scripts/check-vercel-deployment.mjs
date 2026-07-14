const BASE_URL = process.env.SAGE_UTOPIA_URL || 'https://sage-utopia.vercel.app';
const PATHS = ['/', '/friends.html', '/online-only.js'];
const TIMEOUT_MS = Number(process.env.SAGE_UTOPIA_CHECK_TIMEOUT_MS || 15000);
const ATTEMPTS = Number(process.env.SAGE_UTOPIA_CHECK_ATTEMPTS || 3);

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function headerValue(response, name) {
  return response.headers.get(name) || '';
}

function errorMessage(error) {
  const cause = error.cause ? ` (${error.cause.code || error.cause.message})` : '';
  return error.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : `${error.message}${cause}`;
}

async function checkPath(path) {
  const url = new URL(path, BASE_URL).toString();
  let lastError = '';

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const server = headerValue(response, 'server');
      const vercelId = headerValue(response, 'x-vercel-id');
      const cache = headerValue(response, 'x-vercel-cache');

      return {
        path,
        attempt,
        status: response.status,
        ok: response.ok && /vercel/i.test(server) && Boolean(vercelId),
        server,
        vercelId,
        cache,
      };
    } catch (error) {
      lastError = errorMessage(error);
    }
  }

  return {
    path,
    attempt: ATTEMPTS,
    status: 'ERROR',
    ok: false,
    server: '',
    vercelId: '',
    cache: '',
    error: lastError,
  };
}

const results = [];

for (const path of PATHS) {
  results.push(await checkPath(path));
}

for (const result of results) {
  const details =
    result.status === 'ERROR'
      ? result.error
      : `server=${result.server || '-'} cache=${result.cache || '-'} vercelId=${result.vercelId || '-'}`;

  console.log(
    `${result.ok ? 'OK' : 'FAIL'} ${result.path} status=${result.status} attempt=${result.attempt} ${details}`
  );
}

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}
