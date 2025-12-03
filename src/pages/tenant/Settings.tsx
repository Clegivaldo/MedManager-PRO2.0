import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Shield, Building, Image as ImageIcon, HelpCircle, Loader2 } from 'lucide-react';
import { MaskedInput } from '@/components/ui/masked-input';
import { useToast } from '@/hooks/use-toast';
import { searchCEP } from '@/lib/viacep';
import { tenantSettingsSchema, type TenantSettingsFormData } from '@/lib/validations/tenant-settings';
import tenantSettingsService from '@/services/tenant-settings.service';
import { getErrorMessage } from '@/services/api';
import { BACKEND_URL } from '@/config/constants';

export default function TenantSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Estados para uploads
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');

  // Form com React Hook Form + Zod
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<TenantSettingsFormData>({
    resolver: zodResolver(tenantSettingsSchema),
    mode: 'onChange',
  });

  const zipCode = watch('zipCode');

  // Carregar dados ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  // Buscar CEP automaticamente
  useEffect(() => {
    if (zipCode && zipCode.replace(/\D/g, '').length === 8) {
      handleCEPLookup();
    }
  }, [zipCode]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await tenantSettingsService.getSettings();

      // Preencher formulário
      setValue('cnpj', settings.cnpj);
      setValue('companyName', settings.companyName);
      setValue('tradingName', settings.tradingName || '');
      setValue('stateRegistration', settings.stateRegistration || '');
      setValue('municipalRegistration', settings.municipalRegistration || '');
      setValue('taxRegime', settings.taxRegime as any);
      setValue('zipCode', settings.zipCode);
      setValue('street', settings.street);
      setValue('number', settings.number);
      setValue('complement', settings.complement || '');
      setValue('neighborhood', settings.neighborhood);
      setValue('city', settings.city);
      setValue('state', settings.state);
      setValue('phone', settings.phone);
      setValue('mobile', settings.mobile || '');
      setValue('email', settings.email);
      setValue('nfeEmail', settings.nfeEmail || '');
      setValue('cscId', settings.cscId || '');
      setValue('sefazEnvironment', settings.sefazEnvironment as any);

      // Carregar logo se existir
      if (settings.logoUrl) {
        setLogoPreview(`${BACKEND_URL}${settings.logoUrl}`);
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar configurações',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCEPLookup = async () => {
    try {
      const address = await searchCEP(zipCode);
      setValue('street', address.street);
      setValue('neighborhood', address.neighborhood);
      setValue('city', address.city);
      setValue('state', address.state);

      toast({
        title: 'Endereço encontrado',
        description: 'Dados preenchidos automaticamente',
      });
    } catch (error) {
      // Silenciosamente falhar - usuário pode preencher manualmente
      console.warn('CEP lookup failed:', error);
    }
  };

  const onSubmit = async (data: TenantSettingsFormData) => {
    try {
      setSaving(true);

      await tenantSettingsService.updateSettings(data);

      toast({
        title: 'Configurações salvas',
        description: 'Suas alterações foram salvas com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Upload de logo
  const onDropLogo = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setLogo(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logo) return;

    try {
      setUploadingLogo(true);
      const logoUrl = await tenantSettingsService.uploadLogo(logo);
      setLogoPreview(`${BACKEND_URL}${logoUrl}`);
      setLogo(null);

      toast({
        title: 'Logo enviado',
        description: 'Logo atualizado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar logo',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  // Upload de certificado
  const onDropCertificate = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCertificate(acceptedFiles[0]);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certificate || !certificatePassword) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione o certificado e informe a senha',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingCert(true);
      await tenantSettingsService.uploadCertificate(certificate, certificatePassword);
      setCertificate(null);
      setCertificatePassword('');

      toast({
        title: 'Certificado enviado',
        description: 'Certificado digital configurado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar certificado',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setUploadingCert(false);
    }
  };

  const { getRootProps: getRootPropsLogo, getInputProps: getInputPropsLogo, isDragActive: isDragActiveLogo } = useDropzone({
    onDrop: onDropLogo,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg'] },
    maxFiles: 1,
    maxSize: 2097152, // 2MB
  });

  const { getRootProps: getRootPropsCert, getInputProps: getInputPropsCert, isDragActive: isDragActiveCert } = useDropzone({
    onDrop: onDropCertificate,
    accept: { 'application/x-pkcs12': ['.pfx', '.p12'] },
    maxFiles: 1,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie as configurações da sua empresa</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList>
            <TabsTrigger value="company">Empresa e NFe</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Dados da Empresa e Nota Fiscal</CardTitle>
                <CardDescription>Informações cadastrais completas para faturamento, emissão de NFe e orçamentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Logo da Empresa */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2 text-primary" />
                    Logo da Empresa
                  </h3>
                  <div className="p-6 border-2 border-dashed rounded-lg">
                    {!logo && !logoPreview ? (
                      <div {...getRootPropsLogo()} className="cursor-pointer text-center">
                        <input {...getInputPropsLogo()} />
                        <div className="flex flex-col items-center justify-center space-y-2 text-gray-500">
                          <UploadCloud className="w-12 h-12" />
                          {isDragActiveLogo ? (
                            <p>Solte a imagem aqui...</p>
                          ) : (
                            <>
                              <p>Arraste e solte a logo da empresa aqui, ou clique para selecionar.</p>
                              <p className="text-xs">Formatos aceitos: PNG, JPG, JPEG, SVG (máx. 2MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {logoPreview && (
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                              />
                            )}
                            {logo && (
                              <div>
                                <p className="font-medium">{logo.name}</p>
                                <p className="text-sm text-gray-500">{(logo.size / 1024).toFixed(2)} KB</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {logo && (
                              <Button
                                type="button"
                                onClick={handleUploadLogo}
                                disabled={uploadingLogo}
                              >
                                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Enviar
                              </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon" onClick={removeLogo}>
                              <X className="w-5 h-5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados Cadastrais */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-primary" />
                    Dados Cadastrais
                  </h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ *</Label>
                        <Controller
                          name="cnpj"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              {...field}
                              mask="99.999.999/9999-99"
                              placeholder="00.000.000/0000-00"
                            />
                          )}
                        />
                        {errors.cnpj && (
                          <p className="text-sm text-red-600">{errors.cnpj.message}</p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="companyName">Razão Social *</Label>
                        <Input {...register('companyName')} placeholder="Razão social da empresa" />
                        {errors.companyName && (
                          <p className="text-sm text-red-600">{errors.companyName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="tradingName">Nome Fantasia</Label>
                        <Input {...register('tradingName')} placeholder="Nome fantasia" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                        <Input {...register('stateRegistration')} placeholder="123.456.789.012" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="municipalRegistration">Inscrição Municipal</Label>
                        <Input {...register('municipalRegistration')} placeholder="12345678" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxRegime">Regime Tributário *</Label>
                        <Controller
                          name="taxRegime"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o regime" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="simple_national">Simples Nacional</SelectItem>
                                <SelectItem value="real_profit">Lucro Real</SelectItem>
                                <SelectItem value="presumed_profit">Lucro Presumido</SelectItem>
                                <SelectItem value="mei">MEI</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.taxRegime && (
                          <p className="text-sm text-red-600">{errors.taxRegime.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Endereço</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <Controller
                          name="zipCode"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              {...field}
                              mask="99999-999"
                              placeholder="00000-000"
                            />
                          )}
                        />
                        {errors.zipCode && (
                          <p className="text-sm text-red-600">{errors.zipCode.message}</p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua/Avenida *</Label>
                        <Input {...register('street')} placeholder="Nome da rua" />
                        {errors.street && (
                          <p className="text-sm text-red-600">{errors.street.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input {...register('number')} placeholder="123" />
                        {errors.number && (
                          <p className="text-sm text-red-600">{errors.number.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input {...register('complement')} placeholder="Sala, Andar, etc" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input {...register('neighborhood')} placeholder="Nome do bairro" />
                        {errors.neighborhood && (
                          <p className="text-sm text-red-600">{errors.neighborhood.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input {...register('city')} placeholder="Nome da cidade" />
                        {errors.city && (
                          <p className="text-sm text-red-600">{errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado *</Label>
                        <Input {...register('state')} placeholder="UF" maxLength={2} />
                        {errors.state && (
                          <p className="text-sm text-red-600">{errors.state.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contatos */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Contatos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone Principal *</Label>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            {...field}
                            mask="(99) 9999-9999"
                            placeholder="(00) 0000-0000"
                          />
                        )}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Celular/WhatsApp</Label>
                      <Controller
                        name="mobile"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            {...field}
                            mask="(99) 99999-9999"
                            placeholder="(00) 00000-0000"
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail Principal *</Label>
                      <Input {...register('email')} type="email" placeholder="contato@empresa.com.br" />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nfeEmail">E-mail para NFe</Label>
                      <Input {...register('nfeEmail')} type="email" placeholder="nfe@empresa.com.br" />
                    </div>
                  </div>
                </div>

                {/* Certificado Digital */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary" />
                    Certificado Digital A1
                  </h3>
                  <div className="p-6 border-2 border-dashed rounded-lg">
                    {!certificate ? (
                      <div {...getRootPropsCert()} className="cursor-pointer text-center">
                        <input {...getInputPropsCert()} />
                        <div className="flex flex-col items-center justify-center space-y-2 text-gray-500">
                          <UploadCloud className="w-12 h-12" />
                          {isDragActiveCert ? (
                            <p>Solte o arquivo aqui...</p>
                          ) : (
                            <>
                              <p>Arraste e solte o arquivo .pfx ou .p12 aqui, ou clique para selecionar.</p>
                              <p className="text-xs">O certificado é armazenado de forma segura e usado apenas para assinar as NFes.</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileIcon className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium">{certificate.name}</p>
                              <p className="text-sm text-gray-500">{(certificate.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setCertificate(null)}>
                            <X className="w-5 h-5 text-red-500" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cert-password">Senha do Certificado *</Label>
                          <Input
                            id="cert-password"
                            type="password"
                            value={certificatePassword}
                            onChange={(e) => setCertificatePassword(e.target.value)}
                            placeholder="Digite a senha do seu certificado digital"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleUploadCertificate}
                          disabled={uploadingCert}
                        >
                          {uploadingCert ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Enviar Certificado
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configurações SEFAZ */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Configurações SEFAZ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="cscId">CSC ID</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Identificador do Código de Segurança do Contribuinte. Geralmente é um número (1, 2, 3...) fornecido pela SEFAZ.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input {...register('cscId')} placeholder="Ex: 1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sefazEnvironment">Ambiente SEFAZ *</Label>
                      <Controller
                        name="sefazEnvironment"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o ambiente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="homologacao">Homologação</SelectItem>
                              <SelectItem value="producao">Produção</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={saving || !isDirty}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>Configure notificações, aparência e comportamentos gerais do sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notificações</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-low-stock">Estoque Baixo</Label>
                        <p className="text-sm text-muted-foreground">Receber alertas quando produtos atingirem estoque mínimo</p>
                      </div>
                      <Input type="checkbox" id="notify-low-stock" className="w-4 h-4" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-expiry">Produtos Vencendo</Label>
                        <p className="text-sm text-muted-foreground">Alertas sobre produtos próximos do vencimento</p>
                      </div>
                      <Input type="checkbox" id="notify-expiry" className="w-4 h-4" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-nfe">Status de NFe</Label>
                        <p className="text-sm text-muted-foreground">Notificações sobre processamento de notas fiscais</p>
                      </div>
                      <Input type="checkbox" id="notify-nfe" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button>Salvar Preferências</Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </>
  );
}
