-- CreateTable
CREATE TABLE "tenant_fiscal_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "cnpj" TEXT NOT NULL,
    "state_registration" TEXT,
    "municipal_registration" TEXT,
    "tax_regime" TEXT NOT NULL DEFAULT 'simple_national',
    "address" JSONB,
    "phone" TEXT,
    "email" TEXT,
    "csc_id" TEXT,
    "csc_token" TEXT,
    "certificate_type" TEXT,
    "certificate_path" TEXT,
    "certificate_password" TEXT,
    "certificate_expires_at" TIMESTAMP(3),
    "sefaz_environment" TEXT NOT NULL DEFAULT 'homologacao',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_fiscal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_series" (
    "id" TEXT NOT NULL,
    "fiscal_profile_id" TEXT NOT NULL,
    "series_number" INTEGER NOT NULL,
    "invoice_type" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_fiscal_profiles_tenant_id_key" ON "tenant_fiscal_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_fiscal_profiles_cnpj_idx" ON "tenant_fiscal_profiles"("cnpj");

-- CreateIndex
CREATE INDEX "fiscal_series_fiscal_profile_id_idx" ON "fiscal_series"("fiscal_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_series_fiscal_profile_id_series_number_invoice_type_key" ON "fiscal_series"("fiscal_profile_id", "series_number", "invoice_type");

-- AddForeignKey
ALTER TABLE "tenant_fiscal_profiles" ADD CONSTRAINT "tenant_fiscal_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_series" ADD CONSTRAINT "fiscal_series_fiscal_profile_id_fkey" FOREIGN KEY ("fiscal_profile_id") REFERENCES "tenant_fiscal_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
