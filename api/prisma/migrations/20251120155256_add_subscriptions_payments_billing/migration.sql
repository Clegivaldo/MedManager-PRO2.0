-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "modules_enabled" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "payment_gateway" TEXT NOT NULL DEFAULT 'asaas',
ADD COLUMN     "subscription_end" TIMESTAMP(3),
ADD COLUMN     "subscription_start" TIMESTAMP(3),
ADD COLUMN     "subscription_status" TEXT NOT NULL DEFAULT 'trial';

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(65,30) NOT NULL,
    "price_annual" DECIMAL(65,30),
    "max_users" INTEGER NOT NULL,
    "max_products" INTEGER NOT NULL,
    "max_monthly_transactions" INTEGER NOT NULL,
    "max_storage_gb" INTEGER NOT NULL,
    "max_api_calls_per_minute" INTEGER NOT NULL DEFAULT 60,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_highlighted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "trial_end_date" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "billing_account_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "payment_method" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_charge_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "pix_qr_code" TEXT,
    "pix_qr_code_base64" TEXT,
    "boleto_url" TEXT,
    "boleto_barcode" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(65,30),
    "reference_month" TIMESTAMP(3),
    "invoice_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "user_count" INTEGER NOT NULL DEFAULT 0,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "storage_used_mb" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "nfe_issued" INTEGER NOT NULL DEFAULT 0,
    "peak_api_calls_per_minute" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_end_date_idx" ON "subscriptions"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_charge_id_key" ON "payments"("gateway_charge_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payments_gateway_gateway_charge_id_idx" ON "payments"("gateway", "gateway_charge_id");

-- CreateIndex
CREATE INDEX "payments_status_due_date_idx" ON "payments"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_invoice_number_key" ON "billing_accounts"("invoice_number");

-- CreateIndex
CREATE INDEX "billing_accounts_tenant_id_status_idx" ON "billing_accounts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "billing_accounts_due_date_idx" ON "billing_accounts"("due_date");

-- CreateIndex
CREATE INDEX "billing_accounts_status_due_date_idx" ON "billing_accounts"("status", "due_date");

-- CreateIndex
CREATE INDEX "usage_metrics_tenant_id_period_idx" ON "usage_metrics"("tenant_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "usage_metrics_tenant_id_period_key" ON "usage_metrics"("tenant_id", "period");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
