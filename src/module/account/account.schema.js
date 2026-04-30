import { z } from "zod";

export const createAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(25),
  lastName: z.string().trim().max(25).optional().default(""),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  client_id: z.string().trim().min(1),
  redirect_uri: z.string().trim().url(),
  response_type: z.string().trim().default("code").optional(),
  scope: z.string().trim().default("openid profile email").optional(),
  state: z.string().trim().min(1),
  nonce: z.string().trim().min(8).optional(),
  code_challenge: z.string().trim().min(43).max(128),
  code_challenge_method: z.literal("S256"),
});
