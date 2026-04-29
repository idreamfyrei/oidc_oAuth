import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { oauthAuthorizationCodesTable } from "../../common/db/db.js";
import config from "../../common/config/connection.js";
import { randomBase64Url } from "../../common/utils/pkce.js";
import { getClientByClientId } from "../client/client.service.js";
import { authorizeSchema } from "./oauth.schema.js";

export const createOauthError = (statusCode, oauthError, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.oauthError = oauthError;
  return error;
};

export const getScopeList = (scope = "") =>
  scope
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean);

export const includesOpenId = (scope) => getScopeList(scope).includes("openid");

export const validateClientRedirectUri = (client, redirectUri) => {
  if (!client.redirect_uris.includes(redirectUri)) {
    throw createOauthError(400, "invalid_request", "redirect_uri is not allowed for this client.");
  }
};

export const validateAuthorizeRequest = async (payload) => {
  const parsed = authorizeSchema.parse(payload);
  const client = await getClientByClientId(parsed.client_id);

  if (!client) {
    throw createOauthError(400, "invalid_client", "Unknown client_id.");
  }

  validateClientRedirectUri(client, parsed.redirect_uri);

  if (includesOpenId(parsed.scope) && !parsed.nonce) {
    throw createOauthError(
      400,
      "invalid_request",
      "nonce is required when the openid scope is requested.",
    );
  }

  return {
    ...parsed,
    client,
  };
};

export const createAuthorizationCode = async ({
  user,
  client,
  redirectUri,
  scope,
  nonce,
  codeChallenge,
  codeChallengeMethod,
}) => {
  const code = randomBase64Url(32);
  const expiresAt = new Date(Date.now() + config.authorizationCodeTtlSeconds * 1000);

  await db.insert(oauthAuthorizationCodesTable).values({
    code,
    userId: user.id,
    clientId: client.client_id,
    redirectUri,
    scope,
    nonce: nonce || null,
    codeChallenge,
    codeChallengeMethod,
    expiresAt,
  });

  return code;
};

export const consumeAuthorizationCode = async (code) => {
  const codeRows = await db
    .select()
    .from(oauthAuthorizationCodesTable)
    .where(eq(oauthAuthorizationCodesTable.code, code))
    .limit(1);
  const codeRecord = codeRows[0];

  if (!codeRecord) {
    throw createOauthError(400, "invalid_grant", "Authorization code is invalid.");
  }

  await db.delete(oauthAuthorizationCodesTable).where(eq(oauthAuthorizationCodesTable.id, codeRecord.id));
  return codeRecord;
};
