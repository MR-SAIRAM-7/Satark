/** API client: the JWT lives in localStorage, every request carries it, a 401 sends the officer back to sign-in. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/v1').replace(/\/$/, '');
export const SOCKET_URL = API_BASE.replace(/\/v1$/, '');

const TOKEN_KEY = 'satark.police.token';
const USER_KEY = 'satark.police.user';

export interface Officer {
  id: string;
  name: string;
  role: string;
  badge?: string;
  station?: string;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const session = {
  token: () => (typeof window === 'undefined' ? null : read(TOKEN_KEY)),
  user: (): Officer | null => {
    const raw = typeof window === 'undefined' ? null : read(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as Officer) : null;
    } catch {
      return null;
    }
  },
  save(token: string, user: Officer) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Private mode: the session lasts for this page only.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const token = session.token();
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth')) {
    session.clear();
    window.location.href = '/login';
  }
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string })?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);
