// Adicione este modelo após InvoiceItem e antes de ControlledPrescription

model TenantSettings {
  id                      String    @id @default(uuid())
  
  // Dados cadastrais
  cnpj                    String    @unique
  companyName             String    @map("company_name")
  tradingName             String?   @map("trading_name")
  stateRegistration       String?   @map("state_registration")
  municipalRegistration   String?   @map("municipal_registration")
  taxRegime               TaxRegime @default(SIMPLE_NATIONAL) @map("tax_regime")
  
  // Endereço
  zipCode                 String    @map("zip_code")
  street                  String
  number                  String
  complement              String?
  neighborhood            String
  city                    String
  state                   String
  
  // Contatos
  phone                   String
  mobile                  String?
  email                   String
  nfeEmail                String?   @map("nfe_email")
  
  // Logo
  logoUrl                 String?   @map("logo_url")
  
  // Certificado digital
  certificatePath         String?   @map("certificate_path")
  certificatePassword     String?   @map("certificate_password") // Encrypted
  certificateExpiryDate   DateTime? @map("certificate_expiry_date")
  
  // Configurações SEFAZ
  cscId                   String?   @map("csc_id")
  cscToken                String?   @map("csc_token") // Encrypted
  sefazEnvironment        SefazEnvironment @default(HOMOLOGACAO) @map("sefaz_environment")
  
  // Numeração de NFe
  nfeNextNumber           Int       @default(1) @map("nfe_next_number")
  nfeSeries               Int       @default(1) @map("nfe_series")
  
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  
  @@map("tenant_settings")
  @@index([cnpj])
}

// Adicione estes enums ao final do arquivo, após InvoiceStatus

enum TaxRegime {
  SIMPLE_NATIONAL
  REAL_PROFIT
  PRESUMED_PROFIT
  MEI
}

enum SefazEnvironment {
  HOMOLOGACAO
  PRODUCAO
}
