ALTER TABLE "oauth_clients" ADD COLUMN IF NOT EXISTS "backchannel_logout_uri" text;
