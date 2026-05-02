import { Router } from "express";
import {
  companyRegister,
  getClientPublicDetails,
  getClients,
  registerClient,
} from "./client.controller.js";

const clientRouter = Router();

clientRouter.post("/company/register", companyRegister);
clientRouter.get("/clients", getClients);
clientRouter.post("/clients/register", registerClient);
clientRouter.get("/clients/:clientId", getClientPublicDetails);

export default clientRouter;
