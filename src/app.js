import express from "express";
import ApiResponse from "./common/utils/api-response.js";
import authRoutes from "./module/auth/auth.route.js";
import accountRoutes from "./module/account/account.route.js";
import clientRoutes from "./module/client/client.route.js";
import oauthRoutes from "./module/oauth/oauth.route.js";
import webRoutes from "./module/web/web.route.js";
import errorHandler from "./common/middleware/error-handler.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(oauthRoutes);
app.use(webRoutes);
app.use(clientRoutes);
app.use(accountRoutes);
app.use(authRoutes);

app.get("/health", (_req, res) => {
  return ApiResponse.ok(res, "OK");
});

app.use(errorHandler);

export default app;
