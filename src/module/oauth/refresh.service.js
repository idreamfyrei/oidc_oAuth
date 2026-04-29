import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { oauthRefreshTokensTable } from "../../common/db/db.js";
import config from "../../common/config/connection.js";
import { randomBase64Url } from "../../common/utils/pkce.js";
import { createOauthError } from "./authorize.service.js";

export const createRefreshToken = async ({
  userId,
  clientId,
  scope,
  nonce,
  rotatedFromTokenId = null,
}) => {
  const token = randomBase64Url(48);
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000);

  const insertedRows = await db
    .insert(oauthRefreshTokensTable)
    .values({
      token,
      userId,
      clientId,
      scope,
      nonce: nonce || null,
      expiresAt,
      rotatedFromTokenId,
    })
    .returning({ token: oauthRefreshTokensTable.token, id: oauthRefreshTokensTable.id });

  return insertedRows[0];
};

export const consumeRefreshToken = async (token) => {
  const refreshTokenRows = await db
    .select()
    .from(oauthRefreshTokensTable)
    .where(eq(oauthRefreshTokensTable.token, token))
    .limit(1);
  const storedRefreshToken = refreshTokenRows[0];

  if (!storedRefreshToken) {
    throw createOauthError(400, "invalid_grant", "Refresh token is invalid.");
  }

  await db.delete(oauthRefreshTokensTable).where(eq(oauthRefreshTokensTable.id, storedRefreshToken.id));
  return storedRefreshToken;
};
