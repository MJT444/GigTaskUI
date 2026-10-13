// One place for all HTTP calls. Every failure becomes an ApiError with a
// stable `code` the screens can switch on (see api/src/lib/pgErrors.js).

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the API server. Is it running on port 4000?');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response (e.g. the Vite proxy's 502 page when the API is down)
  }

  if (!res.ok) {
    const e = json?.error;
    if (e) throw new ApiError(res.status, e.code, e.message, e.details);
    throw new ApiError(
      res.status,
      res.status === 502 || res.status === 504 ? 'NETWORK' : 'HTTP_ERROR',
      res.status === 502 || res.status === 504
        ? 'Cannot reach the API server. Is it running on port 4000?'
        : `Request failed (${res.status})`,
    );
  }
  return json;
}

/** Build "?a=1&b=2", skipping empty values. */
export function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
};
