import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { oauthClientsTable } from "../../common/db/db.js";
import config from "../../common/config/connection.js";
import ApiError from "../../common/utils/api-error.js";

const defaultClients = [
  {
    client_id: config.clients.web.clientId,
    client_name: "OIDC Demo Web Client",
    redirect_uris: config.clients.web.redirectUris,
    backchannel_logout_uri: null,
    token_endpoint_auth_method: "none",
    application_type: "web",
    is_first_party: true,
  },
  {
    client_id: config.clients.mobile.clientId,
    client_name: "OIDC Demo Mobile Client",
    redirect_uris: config.clients.mobile.redirectUris,
    backchannel_logout_uri: null,
    token_endpoint_auth_method: "none",
    application_type: "native",
    is_first_party: true,
  },
];

const randomSuffix = () => crypto.randomBytes(4).toString("hex");

const normalizeClientRow = (row) => ({
  client_id: row.clientId,
  client_name: row.clientName,
  app_url: row.appUrl || null,
  redirect_uris: JSON.parse(row.redirectUris),
  backchannel_logout_uri: row.backchannelLogoutUri || null,
  token_endpoint_auth_method: row.tokenEndpointAuthMethod,
  application_type: row.applicationType,
  owner_user_id: row.ownerUserId || null,
  is_first_party: false,
});

export const listClients = async () => {
  const rows = await db.select().from(oauthClientsTable);
  return [...defaultClients, ...rows.map(normalizeClientRow)];
};

export const getClientByClientId = async (clientId) => {
  const firstPartyClient = defaultClients.find((client) => client.client_id === clientId);

  if (firstPartyClient) {
    return firstPartyClient;
  }

  const rows = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.clientId, clientId))
    .limit(1);

  return rows[0] ? normalizeClientRow(rows[0]) : null;
};

export const getClientOrThrow = async (clientId) => {
  const client = await getClientByClientId(clientId);

  if (!client) {
    throw ApiError.badRequest("Unknown client_id.");
  }

  return client;
};

export const listClientsForOwner = async (ownerUserId) => {
  const rows = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.ownerUserId, ownerUserId));

  return rows.map(normalizeClientRow);
};

export const registerClientApplication = async (payload, options = {}) => {
  const clientId = payload.clientId || `client-${randomSuffix()}`;
  const existingClient = await getClientByClientId(clientId);

  if (existingClient) {
    throw ApiError.conflict("That client_id is already in use.");
  }

  const inserted = await db
    .insert(oauthClientsTable)
    .values({
      clientId,
      clientName: payload.clientName,
      appUrl: payload.websiteUrl?.trim() || null,
      redirectUris: JSON.stringify(payload.redirectUris),
      backchannelLogoutUri: payload.backchannelLogoutUri?.trim() || null,
      applicationType: payload.applicationType,
      tokenEndpointAuthMethod: payload.tokenEndpointAuthMethod || "none",
      ownerUserId: options.ownerUserId || null,
    })
    .returning();

  return normalizeClientRow(inserted[0]);
};
