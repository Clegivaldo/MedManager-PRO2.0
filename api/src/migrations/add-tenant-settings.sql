-- Adicionar modelo TenantSettings ao schema Prisma
-- Execute esta migration em cada banco de dados tenant

-- Criar enums
CREATE TYPE "TaxRegime" AS ENUM ('SIMPLE_NATIONAL', 'REAL_PROFIT', 'PRESUMED_PROFIT', 'MEI');
CREATE TYPE "SefazEnvironment" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

-- Criar tabela tenant_settings
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "state_registration" TEXT,
    "municipal_registration" TEXT,
    "tax_regime" "TaxRegime" NOT NULL DEFAULT 'SIMPLE_NATIONAL',
    "zip_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT NOT NULL,
    "nfe_email" TEXT,
    "logo_url" TEXT,
    "certificate_path" TEXT,
    "certificate_password" TEXT,
    "certificate_expiry_date" TIMESTAMP(3),
    "csc_id" TEXT,
    "csc_token" TEXT,
    "sefaz_environment" "SefazEnvironment" NOT NULL DEFAULT 'HOMOLOGACAO',
    "nfe_next_number" INTEGER NOT NULL DEFAULT 1,
    "nfe_series" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE UNIQUE INDEX "tenant_settings_cnpj_key" ON "tenant_settings"("cnpj");
CREATE INDEX "tenant_settings_cnpj_idx" ON "tenant_settings"("cnpj");
