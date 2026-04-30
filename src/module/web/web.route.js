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

webRouter.get("/login/start", startWebLogin);
webRouter.get("/login", startWebLoginPage);
webRouter.get("/signin", startWebLoginPage);
webRouter.get("/signup", startWebSignupPage);
webRouter.get("/login/callback", handleWebLoginCallback);
webRouter.get("/dashboard", openDashboard);
webRouter.get("/me", requireWebSession, getWebProfile);
webRouter.get("/apps", requireWebSession, getWebApps);
webRouter.post("/refresh", requireWebSession, refreshWebSession);
webRouter.post("/logout", requireWebSession, logoutWebSession);

export default webRouter;
