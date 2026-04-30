import ApiResponse from "../../common/utils/api-response.js";
import {
  buildFlowCookieHeader,
  buildWebAuthPageStartResult,
  buildWebLoginStartResult,
  buildWebSessionCookieHeader,
  clearFlowCookieHeader,
  clearSessionCookieHeader,
  completeWebLoginCallback,
  deleteWebSession,
  getWebOwnedApps,
  getWebMe,
  getWebSessionFromRequest,
  refreshWebSessionTokens,
} from "./web.service.js";

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
    const { redirectUrl, flowCookie } = buildWebAuthPageStartResult("/authenticate.html");
    res.setHeader("Set-Cookie", buildFlowCookieHeader(flowCookie));
    return res.redirect(302, redirectUrl);
  } catch (error) {
    next(error);
  }
};

export const startWebSignupPage = async (req, res, next) => {
  try {
    const { redirectUrl, flowCookie } = buildWebAuthPageStartResult("/signup.html");
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
    return res.redirect(302, "/web/login");
  }
};

export const handleWebLoginCallback = async (req, res, next) => {
  try {
    const { session } = await completeWebLoginCallback({ reqQuery: req.query, req });
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
    await deleteWebSession(req.webSession);
    res.setHeader("Set-Cookie", clearSessionCookieHeader());
    return ApiResponse.ok(res, "Logged out.");
  } catch (error) {
    next(error);
  }
};
