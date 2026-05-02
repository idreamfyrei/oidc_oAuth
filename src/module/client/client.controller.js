import ApiResponse from "../../common/utils/api-response.js";
import { clientIdParamSchema, companyRegisterSchema, registerClientSchema } from "./client.schema.js";
import {
  getClientByClientId,
  listClients,
  registerClientApplication,
  registerCompany,
} from "./client.service.js";
import { getWebSessionFromRequest } from "../web/web.service.js";

export const registerClient = async (req, res, next) => {
  try {
    const payload = registerClientSchema.parse(req.body);
    let ownerUserId = null;

    try {
      const session = await getWebSessionFromRequest(req);
      ownerUserId = session.userId;
    } catch {
      ownerUserId = null;
    }

    const client = await registerClientApplication(payload, { ownerUserId });
    return ApiResponse.created(res, "Client registered.", client);
  } catch (error) {
    next(error);
  }
};

export const getClientPublicDetails = async (req, res, next) => {
  try {
    const { clientId } = clientIdParamSchema.parse(req.params);
    const client = await getClientByClientId(clientId);

    if (!client) {
      return res.status(404).json({
        error: "not_found",
        error_description: "Client not found.",
      });
    }

    return res.json(client);
  } catch (error) {
    next(error);
  }
};

export const companyRegister = async (req, res, next) => {
  try {
    const payload = companyRegisterSchema.parse(req.body);
    const result = await registerCompany(payload);
    return ApiResponse.created(res, "Company and account registered.", result);
  } catch (error) {
    next(error);
  }
};

export const getClients = async (req, res, next) => {
  try {
    const clients = await listClients();
    return ApiResponse.ok(res, "Clients fetched.", clients);
  } catch (error) {
    next(error);
  }
};
