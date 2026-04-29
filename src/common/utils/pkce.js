import crypto from "node:crypto";

export const randomBase64Url = (size = 32) => crypto.randomBytes(size).toString("base64url");

export const buildPkceChallenge = (verifier) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

export const createPkcePair = () => {
  const codeVerifier = randomBase64Url(64);
  return {
    codeVerifier,
    codeChallenge: buildPkceChallenge(codeVerifier),
    codeChallengeMethod: "S256",
  };
};

export const createOauthFlowState = () => ({
  state: randomBase64Url(24),
  nonce: randomBase64Url(24),
});
