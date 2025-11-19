import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import api, { getErrorMessage } from '@/services/api';
import {
  Building2,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Key,
  Settings,
  Plus,
  Edit2,
  XCircle
} from 'lucide-react';

interface FiscalProfile {
  id: string;
  companyName: string;
  tradingName?: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  taxRegime: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phone?: string;
  email?: string;
  cscId?: string;
  cscToken?: string;
  certificateType?: string;
  certificatePath?: string;
  certificateExpiresAt?: string;
  sefazEnvironment: string;
  isActive: boolean;
  series: FiscalSeries[];
}

interface FiscalSeries {
  id: string;
  seriesNumber: number;
  invoiceType: string;
  nextNumber: number;
  isActive: boolean;
}

interface CertificateStatus {
  certificateType?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  status: 'valid' | 'expiring_soon' | 'expired';
}

const FiscalProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<FiscalProfile | null>(null);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [certificateType, setCertificateType] = useState<'A1' | 'A3'>('A1');
  const [uploadingCert, setUploadingCert] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    companyName: '',
    tradingName: '',
    cnpj: '',
    stateRegistration: '',
    municipalRegistration: '',
    taxRegime: 'simple_national',
    phone: '',
    email: '',
    cscId: '',
    cscToken: '',
    sefazEnvironment: 'homologacao',
    address: {
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // Series form
  const [seriesForm, setSeriesForm] = useState({
    seriesNumber: 1,
    invoiceType: 'EXIT',
    nextNumber: 1
  });

  useEffect(() => {
    loadProfile();
    loadCertificateStatus();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/fiscal');
      if (response.data.profile) {
        setProfile(response.data.profile);
        setFormData({
          companyName: response.data.profile.companyName || '',
          tradingName: response.data.profile.tradingName || '',
          cnpj: response.data.profile.cnpj || '',
          stateRegistration: response.data.profile.stateRegistration || '',
          municipalRegistration: response.data.profile.municipalRegistration || '',
          taxRegime: response.data.profile.taxRegime || 'simple_national',
          phone: response.data.profile.phone || '',
          email: response.data.profile.email || '',
          cscId: response.data.profile.cscId || '',
          cscToken: response.data.profile.cscToken || '',
          sefazEnvironment: response.data.profile.sefazEnvironment || 'homologacao',
          address: response.data.profile.address || {
            street: '',
            number: '',
            complement: '',
            district: '',
            city: '',
            state: '',
            zipCode: ''
          }
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast({
          title: 'Erro ao carregar perfil fiscal',
          description: getErrorMessage(error),
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCertificateStatus = async () => {
    try {
      const response = await api.get('/api/v1/fiscal/certificate');
      setCertificateStatus(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error loading certificate status:', error);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/v1/fiscal', formData);
      setProfile(response.data.profile);
      toast({
        title: 'Perfil fiscal salvo',
        description: 'As configurações foram atualizadas com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar perfil',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.pfx') || ext.endsWith('.p12')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Apenas arquivos .pfx ou .p12 são permitidos.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleUploadCertificate = async () => {
    if (!selectedFile) {
      toast({
        title: 'Selecione um arquivo',
        description: 'Por favor, selecione um certificado digital.',
        variant: 'destructive'
      });
      return;
    }

    if (!certificatePassword) {
      toast({
        title: 'Senha obrigatória',
        description: 'Informe a senha do certificado.',
        variant: 'destructive'
      });
      return;
    }

    if (!profile) {
      toast({
        title: 'Perfil fiscal necessário',
        description: 'Crie o perfil fiscal antes de fazer upload do certificado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploadingCert(true);
      const formDataUpload = new FormData();
      formDataUpload.append('certificate', selectedFile);
      formDataUpload.append('password', certificatePassword);
      formDataUpload.append('certificateType', certificateType);

      const response = await api.post('/api/v1/fiscal/certificate', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast({
        title: 'Certificado enviado',
        description: response.data.message
      });

      setSelectedFile(null);
      setCertificatePassword('');
      await loadProfile();
      await loadCertificateStatus();
    } catch (error) {
      toast({
        title: 'Erro ao enviar certificado',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setUploadingCert(false);
    }
  };

  const handleAddSeries = async () => {
    if (!profile) {
      toast({
        title: 'Perfil fiscal necessário',
        description: 'Crie o perfil fiscal antes de adicionar séries.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/v1/fiscal/series', seriesForm);
      toast({
        title: 'Série adicionada',
        description: 'Série fiscal criada com sucesso.'
      });
      setSeriesForm({ seriesNumber: 1, invoiceType: 'EXIT', nextNumber: 1 });
      await loadProfile();
    } catch (error) {
      toast({
        title: 'Erro ao adicionar série',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCertificateStatusBadge = () => {
    if (!certificateStatus) {
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          Sem certificado
        </Badge>
      );
    }

    if (certificateStatus.isExpired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Expirado
        </Badge>
      );
    }

    if (certificateStatus.isExpiringSoon) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          Expira em {certificateStatus.daysUntilExpiry} dias
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Válido por {certificateStatus.daysUntilExpiry} dias
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Perfil Fiscal
          </h1>
          <p className="text-muted-foreground">
            Configurações fiscais, certificado digital e séries de NF-e
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <Building2 className="h-4 w-4 mr-2" />
            Dados da Empresa
          </TabsTrigger>
          <TabsTrigger value="certificate">
            <Shield className="h-4 w-4 mr-2" />
            Certificado Digital
          </TabsTrigger>
          <TabsTrigger value="csc">
            <Key className="h-4 w-4 mr-2" />
            CSC (Token NFC-e)
          </TabsTrigger>
          <TabsTrigger value="series">
            <FileText className="h-4 w-4 mr-2" />
            Séries Fiscais
          </TabsTrigger>
        </TabsList>

        {/* Dados da Empresa */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Configure os dados fiscais da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Razão Social *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Nome registrado na Receita Federal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tradingName">Nome Fantasia</Label>
                  <Input
                    id="tradingName"
                    value={formData.tradingName}
                    onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                    placeholder="Nome comercial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '') })}
                    placeholder="00000000000000"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                  <Input
                    id="stateRegistration"
                    value={formData.stateRegistration}
                    onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipalRegistration">Inscrição Municipal</Label>
                  <Input
                    id="municipalRegistration"
                    value={formData.municipalRegistration}
                    onChange={(e) => setFormData({ ...formData, municipalRegistration: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRegime">Regime Tributário</Label>
                  <Select value={formData.taxRegime} onValueChange={(value) => setFormData({ ...formData, taxRegime: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple_national">Simples Nacional</SelectItem>
                      <SelectItem value="real_profit">Lucro Real</SelectItem>
                      <SelectItem value="presumed_profit">Lucro Presumido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sefazEnvironment">Ambiente SEFAZ</Label>
                  <Select value={formData.sefazEnvironment} onValueChange={(value) => setFormData({ ...formData, sefazEnvironment: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção (Real)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.address.number}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, number: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.address.complement}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, complement: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Bairro</Label>
                    <Input
                      id="district"
                      value={formData.address.district}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, district: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value.replace(/\D/g, '') } })}
                      maxLength={8}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF)</Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value.toUpperCase() } })}
                      maxLength={2}
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificado Digital */}
        <TabsContent value="certificate" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Certificado Digital A1/A3</CardTitle>
                  <CardDescription>
                    Upload do certificado digital para assinatura de NF-e
                  </CardDescription>
                </div>
                {getCertificateStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {certificateStatus && !certificateStatus.isExpired && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Certificado {certificateStatus.certificateType} válido até{' '}
                    {certificateStatus.expiresAt ? new Date(certificateStatus.expiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </AlertDescription>
                </Alert>
              )}

              {certificateStatus?.isExpiringSoon && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    Atenção! Seu certificado expira em {certificateStatus.daysUntilExpiry} dias. 
                    Renove-o para evitar interrupções na emissão de notas.
                  </AlertDescription>
                </Alert>
              )}

              {certificateStatus?.isExpired && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Certificado expirado! Faça upload de um novo certificado válido.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificateType">Tipo de Certificado</Label>
                  <Select value={certificateType} onValueChange={(value: 'A1' | 'A3') => setCertificateType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (Arquivo .pfx/.p12)</SelectItem>
                      <SelectItem value="A3">A3 (Token/Smart Card)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificateFile">Arquivo do Certificado</Label>
                  <div className="flex gap-2">
                    <Input
                      id="certificateFile"
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFileSelect}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        const input = document.getElementById('certificateFile') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificatePassword">Senha do Certificado</Label>
                  <Input
                    id="certificatePassword"
                    type="password"
                    value={certificatePassword}
                    onChange={(e) => setCertificatePassword(e.target.value)}
                    placeholder="Digite a senha do certificado"
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Segurança:</strong> O certificado será criptografado e armazenado de forma segura.
                    A senha é necessária apenas para validação durante o upload.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUploadCertificate}
                    disabled={!selectedFile || !certificatePassword || uploadingCert}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingCert ? 'Enviando...' : 'Enviar Certificado'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSC Token */}
        <TabsContent value="csc" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSC - Código de Segurança do Contribuinte</CardTitle>
              <CardDescription>
                Token para emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  O CSC é gerado no portal da SEFAZ do seu estado e é obrigatório para emissão de NFC-e.
                  Para NF-e, o CSC não é obrigatório.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cscId">ID do CSC</Label>
                  <Input
                    id="cscId"
                    value={formData.cscId}
                    onChange={(e) => setFormData({ ...formData, cscId: e.target.value })}
                    placeholder="000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cscToken">Token CSC</Label>
                  <Input
                    id="cscToken"
                    type="password"
                    value={formData.cscToken}
                    onChange={(e) => setFormData({ ...formData, cscToken: e.target.value })}
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Key className="h-4 w-4 mr-2" />
                  Salvar CSC
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Séries Fiscais */}
        <TabsContent value="series" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Séries Fiscais</CardTitle>
              <CardDescription>
                Configure as séries para emissão de notas fiscais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.series && profile.series.length > 0 ? (
                <div className="space-y-2">
                  {profile.series.map((series) => (
                    <div
                      key={series.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            Série {series.seriesNumber} - {series.invoiceType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Próximo número: {series.nextNumber}
                          </p>
                        </div>
                      </div>
                      <Badge variant={series.isActive ? 'default' : 'secondary'}>
                        {series.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma série fiscal configurada. Adicione pelo menos uma série para começar a emitir notas.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Adicionar Nova Série</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seriesNumber">Número da Série</Label>
                    <Input
                      id="seriesNumber"
                      type="number"
                      min="1"
                      value={seriesForm.seriesNumber}
                      onChange={(e) => setSeriesForm({ ...seriesForm, seriesNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceType">Tipo de Nota</Label>
                    <Select
                      value={seriesForm.invoiceType}
                      onValueChange={(value) => setSeriesForm({ ...seriesForm, invoiceType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENTRY">Entrada</SelectItem>
                        <SelectItem value="EXIT">Saída</SelectItem>
                        <SelectItem value="DEVOLUTION">Devolução</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextNumber">Número Inicial</Label>
                    <Input
                      id="nextNumber"
                      type="number"
                      min="1"
                      value={seriesForm.nextNumber}
                      onChange={(e) => setSeriesForm({ ...seriesForm, nextNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleAddSeries} disabled={loading || !profile}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Série
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FiscalProfile;
