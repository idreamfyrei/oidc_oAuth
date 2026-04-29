import config from "../../common/config/connection.js";
import ApiError from "../../common/utils/api-error.js";
import { getJwks } from "../../common/utils/jwt.js";
import { buildPkceChallenge } from "../../common/utils/pkce.js";
import { buildUserProfile, findUserById } from "../account/account.repository.js";
import { getClientByClientId } from "../client/client.service.js";
import { authorizationCodeSchema, refreshTokenSchema } from "./oauth.schema.js";
import {
  consumeAuthorizationCode,
  createAuthorizationCode,
  createOauthError,
  includesOpenId,
  validateAuthorizeRequest,
  validateClientRedirectUri,
} from "./authorize.service.js";
import { buildAccessToken, buildIdToken } from "./token.service.js";
import { consumeRefreshToken, createRefreshToken } from "./refresh.service.js";

export const issueAuthorizationRedirect = async (user, authorizeRequest) => {
  const code = await createAuthorizationCode({
    user,
    client: authorizeRequest.client,
    redirectUri: authorizeRequest.redirect_uri,
    scope: authorizeRequest.scope,
    nonce: authorizeRequest.nonce,
    codeChallenge: authorizeRequest.code_challenge,
    codeChallengeMethod: authorizeRequest.code_challenge_method,
  });

  const redirectUrl = new URL(authorizeRequest.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  redirectUrl.searchParams.set("state", authorizeRequest.state);

  return {
    redirect_to: redirectUrl.toString(),
    code,
    state: authorizeRequest.state,
  };
};

export const getDiscoveryDocument = () => ({
  issuer: config.issuer,
  authorization_endpoint: `${config.issuer}/oauth/authorize`,
  token_endpoint: `${config.issuer}/oauth/token`,
  userinfo_endpoint: `${config.issuer}/oauth/userinfo`,
  jwks_uri: `${config.issuer}/.well-known/jwks.json`,
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  scopes_supported: ["openid", "profile", "email", "offline_access"],
  token_endpoint_auth_methods_supported: ["none"],
  claims_supported: [
    "sub",
    "name",
    "given_name",
    "family_name",
    "email",
    "email_verified",
    "picture",
    "nonce",
  ],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
});

export const getJwksPayload = async () => getJwks();

export const buildConsentRedirect = async (query, baseUrl = config.issuer) => {
  const authorizeRequest = await validateAuthorizeRequest(query);
  const target = new URL("/consent.html", baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      target.searchParams.set(key, value);
    }
  }

  target.searchParams.set("client_name", authorizeRequest.client.client_name);
  return target.toString();
};

export const exchangeAuthorizationCode = async (payload) => {
  const parsed = authorizationCodeSchema.parse(payload);
  const codeRecord = await consumeAuthorizationCode(parsed.code);

  if (codeRecord.expiresAt.getTime() < Date.now()) {
    throw createOauthError(400, "invalid_grant", "Authorization code has expired.");
  }

  if (codeRecord.clientId !== parsed.client_id) {
    throw createOauthError(400, "invalid_grant", "client_id does not match the authorization code.");
  }

  if (codeRecord.redirectUri !== parsed.redirect_uri) {
    throw createOauthError(400, "invalid_grant", "redirect_uri does not match the authorization code.");
  }

  const client = await getClientByClientId(parsed.client_id);

  if (!client) {
    throw createOauthError(400, "invalid_client", "Unknown client_id.");
  }
  validateClientRedirectUri(client, parsed.redirect_uri);

  const computedChallenge = buildPkceChallenge(parsed.code_verifier);

  if (computedChallenge !== codeRecord.codeChallenge) {
    throw createOauthError(400, "invalid_grant", "code_verifier does not match the stored PKCE challenge.");
  }

  const user = await findUserById(codeRecord.userId);

  if (!user) {
    throw createOauthError(400, "invalid_grant", "User no longer exists.");
  }

  const accessToken = await buildAccessToken({
    user,
    scope: codeRecord.scope,
  });

  const refreshTokenRecord = await createRefreshToken({
    userId: user.id,
    clientId: client.client_id,
    scope: codeRecord.scope,
    nonce: codeRecord.nonce,
  });

  const tokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.accessTokenTtlSeconds,
    refresh_token: refreshTokenRecord.token,
    scope: codeRecord.scope,
  };

  if (includesOpenId(codeRecord.scope)) {
    tokenResponse.id_token = await buildIdToken({
      user,
      clientId: client.client_id,
      nonce: codeRecord.nonce,
      accessToken,
    });
  }

  return tokenResponse;
};

export const exchangeRefreshToken = async (payload) => {
  const parsed = refreshTokenSchema.parse(payload);
  const client = await getClientByClientId(parsed.client_id);

  if (!client) {
    throw createOauthError(400, "invalid_client", "Unknown client_id.");
  }
  const storedRefreshToken = await consumeRefreshToken(parsed.refresh_token);

  if (storedRefreshToken.expiresAt.getTime() < Date.now()) {
    throw createOauthError(400, "invalid_grant", "Refresh token has expired.");
  }

  if (storedRefreshToken.clientId !== client.client_id) {
    throw createOauthError(400, "invalid_grant", "Refresh token was not issued to this client.");
  }

  const user = await findUserById(storedRefreshToken.userId);

  if (!user) {
    throw createOauthError(400, "invalid_grant", "User no longer exists.");
  }

  const nextRefreshToken = await createRefreshToken({
    userId: user.id,
    clientId: client.client_id,
    scope: storedRefreshToken.scope,
    nonce: storedRefreshToken.nonce,
    rotatedFromTokenId: storedRefreshToken.id,
  });

  const accessToken = await buildAccessToken({
    user,
    scope: storedRefreshToken.scope,
  });

  const response = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.accessTokenTtlSeconds,
    refresh_token: nextRefreshToken.token,
    scope: storedRefreshToken.scope,
  };

  if (includesOpenId(storedRefreshToken.scope)) {
    response.id_token = await buildIdToken({
      user,
      clientId: client.client_id,
      nonce: storedRefreshToken.nonce,
      accessToken,
    });
  }

  return response;
};

export const getUserInfoClaims = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return buildUserProfile(user);
};
