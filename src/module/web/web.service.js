import { and, eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { oauthRefreshTokensTable, webSessionsTable } from "../../common/db/db.js";
import config from "../../common/config/connection.js";
import { createOauthFlowState, createPkcePair, randomBase64Url } from "../../common/utils/pkce.js";
import ApiError from "../../common/utils/api-error.js";
import { verifyJwt } from "../../common/utils/jwt.js";
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  getUserInfoClaims,
  issueAuthorizationRedirect,
} from "../oauth/oauth.service.js";
import { validateAuthorizeRequest } from "../oauth/authorize.service.js";
import { listClientsForOwner } from "../client/client.service.js";
import { webLoginCallbackSchema } from "./web.schema.js";

const shouldUseSecureCookie = () => process.env.NODE_ENV === "production";

const parseCookieHeader = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};

const deleteCookieHeader = (name) =>
  serializeCookie(name, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: shouldUseSecureCookie(),
  });

const encodeFlowCookieValue = (flow) => Buffer.from(JSON.stringify(flow), "utf8").toString("base64url");
const decodeFlowCookieValue = (value) => JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

const buildWebFlowContext = () => {
  const pkce = createPkcePair();
  const flow = createOauthFlowState();
  const flowPayload = {
    ...pkce,
    ...flow,
    createdAt: Date.now(),
  };

  const query = new URLSearchParams();
  query.set("client_id", config.webClientId);
  query.set("client_name", "OIDC Auth Web Client");
  query.set("redirect_uri", config.webClientRedirectUri);
  query.set("response_type", "code");
  query.set("scope", config.webClientScope);
  query.set("state", flowPayload.state);
  query.set("nonce", flowPayload.nonce);
  query.set("code_challenge", flowPayload.codeChallenge);
  query.set("code_challenge_method", flowPayload.codeChallengeMethod);

  return {
    flowPayload,
    query,
  };
};

export const buildExternalLoginRedirect = async (query) => {
  await validateAuthorizeRequest(query);
  const target = new URL("/authenticate.html", config.issuer);
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === "string") target.searchParams.set(k, v);
  }
  return target.toString();
};

export const hasWebSessionCookie = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  return Boolean(cookies[config.webSessionCookieName]);
};

export const buildExternalSessionRedirect = async ({ query, req }) => {
  const authorizeRequest = await validateAuthorizeRequest(query);
  const session = await getWebSessionFromRequest(req);
  const user = await findUserById(session.userId);

  if (!user) {
    throw ApiError.unauthorized("Signed-in user no longer exists.");
  }

  const result = await issueAuthorizationRedirect(user, authorizeRequest);
  return result.redirect_to;
};

export const buildWebLoginStartResult = () => {
  const { flowPayload, query } = buildWebFlowContext();
  const authorizeUrl = new URL("/oauth/authorize", config.issuer);
  query.forEach((value, key) => authorizeUrl.searchParams.set(key, value));

  return {
    authorizeUrl: authorizeUrl.toString(),
    flowCookie: encodeFlowCookieValue(flowPayload),
  };
};

export const buildWebAuthPageStartResult = (pathname) => {
  const { flowPayload, query } = buildWebFlowContext();
  const redirectUrl = new URL(pathname, config.issuer);
  redirectUrl.search = query.toString();

  return {
    redirectUrl: redirectUrl.toString(),
    flowCookie: encodeFlowCookieValue(flowPayload),
  };
};

export const buildFlowCookieHeader = (value) =>
  serializeCookie(config.webFlowCookieName, value, {
    maxAge: config.webFlowCookieTtlSeconds,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: shouldUseSecureCookie(),
  });

export const getFlowFromRequest = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const flowCookie = cookies[config.webFlowCookieName];

  if (!flowCookie) {
    throw ApiError.badRequest("Missing login flow cookie.");
  }

  const flow = decodeFlowCookieValue(flowCookie);
  const ageMs = Date.now() - Number(flow.createdAt || 0);

  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > config.webFlowCookieTtlSeconds * 1000) {
    throw ApiError.badRequest("Login flow has expired.");
  }

  return flow;
};

export const clearFlowCookieHeader = () => deleteCookieHeader(config.webFlowCookieName);
export const clearSessionCookieHeader = () => deleteCookieHeader(config.webSessionCookieName);

const createWebSessionRow = async ({ tokenResponse, csrfNonce }) => {
  const sessionId = randomBase64Url(48);
  const expiresAt = new Date(Date.now() + config.webSessionTtlSeconds * 1000);
  const accessTokenExpiresAt = new Date(Date.now() + Number(tokenResponse.expires_in || 0) * 1000);

  const insertedRows = await db
    .insert(webSessionsTable)
    .values({
      sessionId,
      userId: tokenResponse.subject,
      clientId: config.webClientId,
      csrfNonce,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      idToken: tokenResponse.id_token || null,
      scope: tokenResponse.scope || config.webClientScope,
      accessTokenExpiresAt,
      expiresAt,
    })
    .returning();

  return insertedRows[0];
};

export const buildWebSessionCookieHeader = (sessionId) =>
  serializeCookie(config.webSessionCookieName, sessionId, {
    maxAge: config.webSessionTtlSeconds,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: shouldUseSecureCookie(),
  });

export const completeWebLoginCallback = async ({ reqQuery, req }) => {
  const parsed = webLoginCallbackSchema.parse(reqQuery);
  const flow = getFlowFromRequest(req);

  if (flow.state !== parsed.state) {
    throw ApiError.badRequest("Invalid state in login callback.");
  }

  const tokenResponse = await exchangeAuthorizationCode({
    grant_type: "authorization_code",
    code: parsed.code,
    redirect_uri: config.webClientRedirectUri,
    client_id: config.webClientId,
    code_verifier: flow.codeVerifier,
  });

  const claims = await getUserInfoClaimsFromAccessToken(tokenResponse.access_token);
  const session = await createWebSessionRow({
    tokenResponse: {
      ...tokenResponse,
      subject: claims.sub,
    },
    csrfNonce: flow.nonce,
  });

  return { session };
};

const getUserInfoClaimsFromAccessToken = async (accessToken) => {
  const payload = await verifyJwt(accessToken, { audience: "userinfo" });
  return getUserInfoClaims(payload.sub);
};

export const getWebSessionFromRequest = async (req) => {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const sessionId = cookies[config.webSessionCookieName];

  if (!sessionId) {
    throw ApiError.unauthorized("Missing web session.");
  }

  const rows = await db
    .select()
    .from(webSessionsTable)
    .where(eq(webSessionsTable.sessionId, sessionId))
    .limit(1);
  const session = rows[0];

  if (!session || session.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized("Web session is invalid or expired.");
  }

  return session;
};

export const refreshWebSessionTokens = async (session) => {
  const tokenResponse = await exchangeRefreshToken({
    grant_type: "refresh_token",
    client_id: session.clientId,
    refresh_token: session.refreshToken,
  });

  const accessTokenExpiresAt = new Date(Date.now() + Number(tokenResponse.expires_in || 0) * 1000);
  const [updated] = await db
    .update(webSessionsTable)
    .set({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      idToken: tokenResponse.id_token || null,
      scope: tokenResponse.scope || session.scope,
      accessTokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(webSessionsTable.id, session.id))
    .returning();

  return updated;
};

export const getWebMe = async (session) => getUserInfoClaims(session.userId);

export const getWebOwnedApps = async (session) => listClientsForOwner(session.userId);

export const logoutClientForUser = async (session) => {
  const sessionRows = await db
    .delete(webSessionsTable)
    .where(
      and(
        eq(webSessionsTable.userId, session.userId),
        eq(webSessionsTable.clientId, session.clientId),
      ),
    )
    .returning({ id: webSessionsTable.id });

  const refreshTokenRows = await db
    .delete(oauthRefreshTokensTable)
    .where(
      and(
        eq(oauthRefreshTokensTable.userId, session.userId),
        eq(oauthRefreshTokensTable.clientId, session.clientId),
      ),
    )
    .returning({ id: oauthRefreshTokensTable.id });

  return {
    clientId: session.clientId,
    sessionsEnded: sessionRows.length,
    refreshTokensRevoked: refreshTokenRows.length,
  };
};
