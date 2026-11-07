/**
 * Who may open the private dashboard and its refresh endpoint.
 *
 * Google sign-in (preferred): when DASHBOARD_GOOGLE_CLIENT_ID,
 * DASHBOARD_GOOGLE_CLIENT_SECRET and DASHBOARD_EMAILS are set, only a Google
 * account listed in DASHBOARD_EMAILS gets in. Sign-in leaves a signed session
 * cookie that expires after SESSION_HOURS. The password is not accepted then,
 * so there is nothing on this site to guess.
 *
 * Password (fallback): with no Google setup, HTTP Basic auth against
 * DASHBOARD_PASSWORD (any user name).
 *
 * Open on localhost; a 404 in production when neither is set.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  DASHBOARD_EMAILS,
  DASHBOARD_GOOGLE_CLIENT_ID,
  DASHBOARD_GOOGLE_CLIENT_SECRET,
  DASHBOARD_PASSWORD,
} from "astro:env/server";
import { SITE } from "@/config";

export const SESSION_HOURS = 12;
const SESSION_COOKIE = "__Host-dashboard";
const FLOW_COOKIE = "__Host-dashboard-login";
const FLOW_MINUTES = 10;

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

/** True when Google sign-in is fully configured (and so replaces the password). */
export function googleSignIn(): boolean {
  return Boolean(
    DASHBOARD_GOOGLE_CLIENT_ID &&
    DASHBOARD_GOOGLE_CLIENT_SECRET &&
    allowedEmails().size
  );
}

function allowedEmails(): Set<string> {
  return new Set(
    (DASHBOARD_EMAILS ?? "")
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

// ---------------------------------------------------------------------------
// Signed cookies: base64url(JSON) + "." + HMAC-SHA256. The key is derived from
// the OAuth client secret, so rotating that secret signs everyone out.

const b64 = (data: Buffer | string) => Buffer.from(data).toString("base64url");

function signingKey(): Buffer {
  return createHmac("sha256", DASHBOARD_GOOGLE_CLIENT_SECRET ?? "")
    .update("urielpapa.com dashboard cookies v1")
    .digest();
}

function sign(payload: Record<string, unknown>): string {
  const body = b64(JSON.stringify(payload));
  const mac = createHmac("sha256", signingKey()).update(body).digest();
  return `${body}.${b64(mac)}`;
}

function unsign<T extends { exp: number }>(token?: string): T | undefined {
  if (!token) return undefined;
  const [body, mac] = token.split(".");
  if (!body || !mac) return undefined;
  const want = createHmac("sha256", signingKey()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want))
    return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return typeof payload.exp === "number" && payload.exp > Date.now()
      ? payload
      : undefined;
  } catch {
    return undefined;
  }
}

function cookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

const setCookie = (name: string, value: string, maxAgeSeconds: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

// ---------------------------------------------------------------------------
// Sessions

type Session = { email: string; exp: number };

/** The signed-in email, if the request carries a valid, unexpired session for an allowed account. */
export function dashboardSession(request: Request): string | undefined {
  if (!googleSignIn()) return undefined;
  const session = unsign<Session>(cookie(request, SESSION_COOKIE));
  return session && allowedEmails().has(session.email)
    ? session.email
    : undefined;
}

export const sessionCookie = (email: string) =>
  setCookie(
    SESSION_COOKIE,
    sign({ email, exp: Date.now() + SESSION_HOURS * 3600_000 }),
    SESSION_HOURS * 3600
  );

export const clearSessionCookie = () => setCookie(SESSION_COOKIE, "", 0);

// ---------------------------------------------------------------------------
// The gate

/**
 * A Response to send instead of the page or endpoint, or undefined when the
 * visitor may see it. `page` sends signed-out visitors to the sign-in page;
 * the refresh endpoint gets a plain 401 instead.
 */
export function dashboardGate(
  request: Request,
  kind: "page" | "api" = "api"
): Response | undefined {
  if (!import.meta.env.PROD) return undefined;
  if (googleSignIn()) {
    if (dashboardSession(request)) return undefined;
    return kind === "page"
      ? new Response(null, {
          status: 303,
          headers: { ...PRIVATE_HEADERS, Location: "/dashboard/login" },
        })
      : new Response(
          "Your dashboard sign-in has expired. Reload the dashboard and sign in again.",
          {
            status: 401,
            headers: {
              ...PRIVATE_HEADERS,
              "Content-Type": "text/plain; charset=utf-8",
            },
          }
        );
  }
  if (!DASHBOARD_PASSWORD)
    return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(
    " "
  );
  let given = "";
  try {
    if (scheme === "Basic" && encoded)
      given = atob(encoded).split(":").slice(1).join(":");
  } catch {
    given = "";
  }
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (timingSafeEqual(digest(given), digest(DASHBOARD_PASSWORD)))
    return undefined;
  return new Response("The dashboard needs the password.", {
    status: 401,
    headers: {
      ...PRIVATE_HEADERS,
      "WWW-Authenticate": 'Basic realm="urielpapa.com dashboard"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/** True when a form post comes from this site (or carries no Origin header). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return (
    !import.meta.env.PROD ||
    !origin ||
    origin === SITE.url ||
    origin === new URL(request.url).origin
  );
}

// ---------------------------------------------------------------------------
// Lockout: after MAX_FAILURES rejected sign-ins from one address within
// LOCK_MINUTES, that address can't start a sign-in for LOCK_MINUTES. Kept in
// the server's memory, so it is per server instance and resets on a cold
// start; Google's own protection of the account is the main line of defence.

const MAX_FAILURES = 5;
export const LOCK_MINUTES = 15;
const failures = new Map<string, { count: number; first: number }>();

export function clientAddress(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Minutes left on this address's lockout, or 0 when it may sign in. */
export function lockedFor(address: string): number {
  const entry = failures.get(address);
  if (!entry) return 0;
  const ends = entry.first + LOCK_MINUTES * 60_000;
  if (Date.now() >= ends) {
    failures.delete(address);
    return 0;
  }
  return entry.count >= MAX_FAILURES
    ? Math.ceil((ends - Date.now()) / 60_000)
    : 0;
}

export function recordFailure(address: string) {
  if (failures.size > 5000) failures.clear();
  const entry = failures.get(address);
  if (entry && Date.now() < entry.first + LOCK_MINUTES * 60_000) entry.count++;
  else failures.set(address, { count: 1, first: Date.now() });
}

export const clearFailures = (address: string) => failures.delete(address);

// ---------------------------------------------------------------------------
// Google OAuth 2.0 / OpenID Connect (authorization code flow with PKCE)

type Flow = { state: string; verifier: string; nonce: string; exp: number };

const redirectUri = (request: Request) =>
  `${import.meta.env.PROD ? SITE.url : new URL(request.url).origin}/dashboard/auth/callback`;

/** The Google consent URL to send the visitor to, and the cookie that remembers this attempt. */
export function startGoogleSignIn(request: Request) {
  const flow: Flow = {
    state: b64(randomBytes(24)),
    verifier: b64(randomBytes(48)),
    nonce: b64(randomBytes(24)),
    exp: Date.now() + FLOW_MINUTES * 60_000,
  };
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: DASHBOARD_GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: b64(createHash("sha256").update(flow.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return {
    location: url.toString(),
    cookie: setCookie(FLOW_COOKIE, sign(flow), FLOW_MINUTES * 60),
  };
}

export const clearFlowCookie = () => setCookie(FLOW_COOKIE, "", 0);

export type SignInResult =
  | { ok: true; email: string }
  | { ok: false; reason: "expired" | "failed" | "denied" };

/**
 * Finishes a sign-in on Google's redirect back: checks the state against this
 * browser's attempt, swaps the code for an ID token and checks who it names.
 */
export async function finishGoogleSignIn(
  request: Request
): Promise<SignInResult> {
  const params = new URL(request.url).searchParams;
  const flow = unsign<Flow>(cookie(request, FLOW_COOKIE));
  const state = params.get("state") ?? "";
  if (
    !flow ||
    state.length !== flow.state.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state))
  )
    return { ok: false, reason: "expired" };
  const code = params.get("code");
  if (!code) return { ok: false, reason: "failed" };

  let idToken: string | undefined;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: DASHBOARD_GOOGLE_CLIENT_ID ?? "",
        client_secret: DASHBOARD_GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri(request),
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok)
      idToken = ((await res.json()) as { id_token?: string }).id_token;
  } catch {
    idToken = undefined;
  }
  if (!idToken) return { ok: false, reason: "failed" };

  // The token came straight from Google's token endpoint over TLS, in exchange
  // for this client's secret, so (per OpenID Connect Core 3.1.3.7) its claims
  // can be checked without verifying the signature.
  let claims: {
    iss?: string;
    aud?: string;
    exp?: number;
    nonce?: string;
    email?: string;
    email_verified?: boolean;
  };
  try {
    claims = JSON.parse(
      Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString()
    );
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (
    !["https://accounts.google.com", "accounts.google.com"].includes(
      claims.iss ?? ""
    ) ||
    claims.aud !== DASHBOARD_GOOGLE_CLIENT_ID ||
    (claims.exp ?? 0) * 1000 < Date.now() ||
    claims.nonce !== flow.nonce
  )
    return { ok: false, reason: "failed" };
  const email = (claims.email ?? "").toLowerCase();
  if (!claims.email_verified || !allowedEmails().has(email))
    return { ok: false, reason: "denied" };
  return { ok: true, email };
}
