import { buildLogoutToken } from "./token.service.js";

const postLogoutToken = async ({ logoutUri, logoutToken }) => {
  const body = new URLSearchParams();
  body.set("logout_token", logoutToken);

  const response = await fetch(logoutUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
  };
};

export const notifyBackchannelLogout = async ({ client, userId }) => {
  if (!client?.backchannel_logout_uri) {
    return {
      delivered: false,
      skipped: true,
      reason: "Client has no back-channel logout URI.",
    };
  }

  const logoutToken = await buildLogoutToken({
    userId,
    clientId: client.client_id,
  });

  try {
    const delivery = await postLogoutToken({
      logoutUri: client.backchannel_logout_uri,
      logoutToken,
    });

    return {
      delivered: delivery.ok,
      skipped: false,
      status: delivery.status,
    };
  } catch (error) {
    console.error({
      message: "Back-channel logout delivery failed.",
      clientId: client.client_id,
      logoutUri: client.backchannel_logout_uri,
      error: error?.message,
    });

    return {
      delivered: false,
      skipped: false,
      error: error?.message || "Delivery failed.",
    };
  }
};
