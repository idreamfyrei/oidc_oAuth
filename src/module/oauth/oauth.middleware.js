import ApiResponse from "../../common/utils/api-response.js";
import { verifyJwt } from "../../common/utils/jwt.js";

export const requireAccessToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return ApiResponse.oauthError(
        res,
        401,
        "invalid_token",
        "Missing Bearer access token.",
      );
    }

    const token = authorization.slice("Bearer ".length);
    const payload = await verifyJwt(token, {
      audience: "userinfo",
    });

    if (payload.token_use !== "access_token") {
      return ApiResponse.oauthError(
        res,
        401,
        "invalid_token",
        "This token is not an access token.",
      );
    }

    req.accessTokenPayload = payload;
    next();
  } catch (error) {
    return ApiResponse.oauthError(res, 401, "invalid_token", error.message);
  }
};
