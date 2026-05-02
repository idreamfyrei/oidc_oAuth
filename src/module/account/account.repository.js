import { eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { usersTable } from "../../common/db/db.js";

export const findUserByEmail = async (email) => {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return rows[0] || null;
};

export const findUserById = async (userId) => {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return rows[0] || null;
};

export const createUser = async (data) => {
  const rows = await db.insert(usersTable).values(data).returning();
  return rows[0];
};

export const buildUserProfile = (user) => ({
  sub: user.id,
  name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
  given_name: user.firstName,
  family_name: user.lastName,
  email: user.email,
  email_verified: user.emailVerified,
  picture: user.profileImageURL || null,
});
