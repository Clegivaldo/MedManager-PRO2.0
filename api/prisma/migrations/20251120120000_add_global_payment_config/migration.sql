-- CreateTable
CREATE TABLE IF NOT EXISTS "global_payment_config" (
  "id" TEXT PRIMARY KEY DEFAULT 'global',
  "active_gateway" TEXT NOT NULL DEFAULT 'asaas',
  "asaas_environment" TEXT NOT NULL DEFAULT 'sandbox',
  "asaas_api_key_enc" TEXT,
  "asaas_webhook_token_enc" TEXT,
  "infinitypay_merchant_id_enc" TEXT,
  "infinitypay_api_key_enc" TEXT,
  "infinitypay_public_key_enc" TEXT,
  "infinitypay_webhook_secret_enc" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure single row exists
INSERT INTO "global_payment_config" ("id")
VALUES ('global')
ON CONFLICT ("id") DO NOTHING;
