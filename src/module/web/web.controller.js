import path from "node:path";
import { fileURLToPath } from "node:url";
import ApiResponse from "../../common/utils/api-response.js";
import { notifyBackchannelLogout } from "../oauth/backchannel-logout.service.js";
import { getClientByClientId } from "../client/client.service.js";
import {
  buildExternalLoginRedirect,
  buildExternalSessionRedirect,
  buildFlowCookieHeader,
  buildWebAuthPageStartResult,
  buildWebLoginStartResult,
  buildWebSessionCookieHeader,
  clearFlowCookieHeader,
  clearSessionCookieHeader,
  completeWebLoginCallback,
  getWebOwnedApps,
  getWebMe,
  getWebSessionFromRequest,
  hasWebSessionCookie,
  logoutClientForUser,
  refreshWebSessionTokens,
} from "./web.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../../public");

export const startExternalLogin = async (req, res, next) => {
  try {
    if (hasWebSessionCookie(req)) {
      try {
        const callbackUrl = await buildExternalSessionRedirect({ query: req.query, req });
        return res.redirect(302, callbackUrl);
      } catch {
        // Stale IdP session; continue with the interactive login page.
      }
    }

    const loginUrl = await buildExternalLoginRedirect(req.query);
    return res.redirect(302, loginUrl);
  } catch (error) {
    if (error.oauthError) {
      return res.status(error.statusCode || 400).json({
        error: error.oauthError,
        error_description: error.message,
      });
    }
    next(error);
  }
};

export const openRegisterPage = (_req, res) => {
  res.sendFile(path.join(publicDir, "client-register.html"));
};

export const startWebLogin = async (req, res, next) => {
  try {
    const { authorizeUrl, flowCookie } = buildWebLoginStartResult();
    res.setHeader("Set-Cookie", buildFlowCookieHeader(flowCookie));
    return res.redirect(302, authorizeUrl);
  } catch (error) {
    next(error);
  }
};

export const startWebLoginPage = async (req, res, next) => {
  try {
    const { redirectUrl, flowCookie } =
      buildWebAuthPageStartResult("/authenticate.html");
    res.setHeader("Set-Cookie", buildFlowCookieHeader(flowCookie));
    return res.redirect(302, redirectUrl);
  } catch (error) {
    next(error);
  }
};

export const startWebSignupPage = async (req, res, next) => {
  try {
    const { redirectUrl, flowCookie } =
      buildWebAuthPageStartResult("/signup.html");
    res.setHeader("Set-Cookie", buildFlowCookieHeader(flowCookie));
    return res.redirect(302, redirectUrl);
  } catch (error) {
    next(error);
  }
};

export const openDashboard = async (req, res) => {
  try {
    await getWebSessionFromRequest(req);
    return res.redirect(302, "/profile.html");
  } catch {
    const { redirectUrl, flowCookie } =
      buildWebAuthPageStartResult("/authenticate.html");
    res.setHeader("Set-Cookie", buildFlowCookieHeader(flowCookie));
    return res.redirect(302, redirectUrl);
  }
};

export const handleWebLoginCallback = async (req, res, next) => {
  try {
    const { session } = await completeWebLoginCallback({
      reqQuery: req.query,
      req,
    });
    res.setHeader("Set-Cookie", [
      clearFlowCookieHeader(),
      buildWebSessionCookieHeader(session.sessionId),
    ]);
    return res.redirect(302, "/profile.html");
  } catch (error) {
    next(error);
  }
};

export const getWebProfile = async (req, res, next) => {
  try {
    const claims = await getWebMe(req.webSession);
    return ApiResponse.ok(res, "Current web user.", claims);
  } catch (error) {
    next(error);
  }
};

export const refreshWebSession = async (req, res, next) => {
  try {
    await refreshWebSessionTokens(req.webSession);
    return ApiResponse.ok(res, "Web session refreshed.");
  } catch (error) {
    next(error);
  }
};

export const getWebApps = async (req, res, next) => {
  try {
    const apps = await getWebOwnedApps(req.webSession);
    return ApiResponse.ok(res, "Registered apps fetched.", apps);
  } catch (error) {
    next(error);
  }
};

export const logoutWebSession = async (req, res, next) => {
  try {
    const client = await getClientByClientId(req.webSession.clientId);
    const backchannel = await notifyBackchannelLogout({
      client,
      userId: req.webSession.userId,
    });
    const result = await logoutClientForUser(req.webSession);
    res.setHeader("Set-Cookie", clearSessionCookieHeader());
    return ApiResponse.ok(res, "Logged out from this client.", {
      ...result,
      backchannel,
    });
  } catch (error) {
    next(error);
  }
};
