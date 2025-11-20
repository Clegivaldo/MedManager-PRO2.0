-- CreateTable
CREATE TABLE "payment_gateway_credentials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asaas_api_key_enc" TEXT,
    "infinitypay_api_key_enc" TEXT,
    "asaas_webhook_secret_enc" TEXT,
    "infinitypay_webhook_secret_enc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_credentials_tenant_id_key" ON "payment_gateway_credentials"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_gateway_credentials_tenant_id_idx" ON "payment_gateway_credentials"("tenant_id");

-- AddForeignKey
ALTER TABLE "payment_gateway_credentials" ADD CONSTRAINT "payment_gateway_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
