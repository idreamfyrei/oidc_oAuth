import { z } from "zod";

export const registerClientSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .optional(),
  clientName: z.string().trim().min(2).max(255),
  websiteUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  redirectUris: z.array(z.string().trim().url()).min(1),
  backchannelLogoutUri: z.union([z.string().trim().url(), z.literal("")]).optional(),
  applicationType: z.enum(["web", "native"]),
  tokenEndpointAuthMethod: z.literal("none").default("none").optional(),
});

export const clientIdParamSchema = z.object({
  clientId: z.string().trim().min(1),
});
