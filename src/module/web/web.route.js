import { Router } from "express";
import {
  getWebApps,
  getWebProfile,
  handleWebLoginCallback,
  logoutWebSession,
  openDashboard,
  refreshWebSession,
  startWebLoginPage,
  startWebLogin,
  startWebSignupPage,
} from "./web.controller.js";
import { requireWebSession } from "./web.middleware.js";

const webRouter = Router();

webRouter.get("/web/login/start", startWebLogin);
webRouter.get("/web/login", startWebLoginPage);
webRouter.get("/web/signup", startWebSignupPage);
webRouter.get("/web/login/callback", handleWebLoginCallback);
webRouter.get("/dashboard", openDashboard);
webRouter.get("/web/me", requireWebSession, getWebProfile);
webRouter.get("/web/apps", requireWebSession, getWebApps);
webRouter.post("/web/refresh", requireWebSession, refreshWebSession);
webRouter.post("/web/logout", requireWebSession, logoutWebSession);

export default webRouter;
