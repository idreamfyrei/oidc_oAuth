import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
const certDirectory = path.join(projectRoot, "cert");

const issuer = process.env.ISSUER || `http://localhost:${process.env.PORT || 3000}`;

const splitList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (values) => [...new Set(values.filter(Boolean))];

export const config = {
  port: Number(process.env.PORT) || 3000,
  issuer,
  keyId: process.env.KEY_ID || "key-1",
  privateKeyPath: process.env.PRIVATE_KEY_PATH || path.join(certDirectory, "private-key.pem"),
  publicKeyPath: process.env.PUBLIC_KEY_PATH || path.join(certDirectory, "public-key.pub"),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 3600,
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 30,
  authorizationCodeTtlSeconds: Number(process.env.AUTHORIZATION_CODE_TTL_SECONDS) || 300,
  webSessionTtlSeconds: Number(process.env.WEB_SESSION_TTL_SECONDS) || 60 * 60 * 24 * 7,
  webFlowCookieTtlSeconds: Number(process.env.WEB_FLOW_COOKIE_TTL_SECONDS) || 600,
  webSessionCookieName: process.env.WEB_SESSION_COOKIE_NAME || "oidc_web_session",
  webFlowCookieName: process.env.WEB_FLOW_COOKIE_NAME || "oidc_web_flow",
  webClientId: process.env.WEB_BFF_CLIENT_ID || "oidc-web-client",
  webClientScope: process.env.WEB_BFF_SCOPE || "openid profile email offline_access",
  webClientRedirectUri:
    process.env.WEB_BFF_REDIRECT_URI || `${issuer}/web/login/callback`,
  imageKit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
  },
  clients: {
    web: {
      clientId: process.env.WEB_CLIENT_ID || "oidc-web-client",
      redirectUris: splitList(process.env.WEB_CLIENT_REDIRECT_URIS),
    },
    mobile: {
      clientId: process.env.MOBILE_CLIENT_ID || "oidc-mobile-client",
      redirectUris: splitList(process.env.MOBILE_CLIENT_REDIRECT_URIS),
    },
  },
};

if (config.clients.web.redirectUris.length === 0) {
  config.clients.web.redirectUris = unique([
    `${issuer}/web/login/callback`,
    `${issuer}/callback.html`,
    `http://localhost:${config.port}/callback.html`,
  ]);
}

if (config.clients.mobile.redirectUris.length === 0) {
  config.clients.mobile.redirectUris = unique(["com.example.mobile://callback"]);
}

export default config;
