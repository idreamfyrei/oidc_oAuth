import bcrypt from "bcrypt";
import { db } from "../../common/db/index.js";
import { usersTable } from "../../common/db/db.js";
import ApiError from "../../common/utils/api-error.js";
import { uploadImageToImageKit } from "../../common/utils/imagekit.js";
import { createAccountSchema } from "./account.schema.js";
import { issueAuthorizationRedirect } from "../oauth/oauth.service.js";
import { validateAuthorizeRequest } from "../oauth/authorize.service.js";
import { findUserByEmail } from "./account.repository.js";

export const registerAccount = async ({ body, file }) => {
  const parsed = createAccountSchema.parse(body);
  const authorizeRequest = await validateAuthorizeRequest(parsed);
  const existingUser = await findUserByEmail(parsed.email);

  if (existingUser) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const uploadResult = file
    ? await uploadImageToImageKit(file, parsed.email.split("@")[0] || "user")
    : null;

  const insertedUsers = await db
    .insert(usersTable)
    .values({
      firstName: parsed.firstName,
      lastName: parsed.lastName || null,
      email: parsed.email,
      password: passwordHash,
      profileImageURL: uploadResult?.url || null,
      emailVerified: true,
    })
    .returning();

  const user = insertedUsers[0];
  return issueAuthorizationRedirect(user, authorizeRequest);
};
