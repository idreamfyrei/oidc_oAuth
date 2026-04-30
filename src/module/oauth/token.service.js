import config from "../../common/config/connection.js";
import { buildAccessTokenHash, signJwt } from "../../common/utils/jwt.js";
import { randomBase64Url } from "../../common/utils/pkce.js";

const nowInSeconds = () => Math.floor(Date.now() / 1000);

export const buildIdToken = async ({ user, clientId, nonce, accessToken }) => {
  const payload = {
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
    given_name: user.firstName,
    family_name: user.lastName,
    picture: user.profileImageURL || undefined,
    token_use: "id_token",
    auth_time: nowInSeconds(),
  };

  if (nonce) {
    payload.nonce = nonce;
  }

  if (accessToken) {
    payload.at_hash = buildAccessTokenHash(accessToken);
  }

  return signJwt(payload, {
    audience: clientId,
    expiresIn: config.accessTokenTtlSeconds,
  });
};

export const buildAccessToken = async ({ user, scope }) =>
  signJwt(
    {
      sub: user.id,
      scope,
      token_use: "access_token",
    },
    {
      audience: "userinfo",
      expiresIn: config.accessTokenTtlSeconds,
    },
  );

export const buildLogoutToken = async ({ userId, clientId }) =>
  signJwt(
    {
      sub: userId,
      events: {
        "http://schemas.openid.net/event/backchannel-logout": {},
      },
      jti: randomBase64Url(24),
    },
    {
      audience: clientId,
      expiresIn: 120,
    },
  );
