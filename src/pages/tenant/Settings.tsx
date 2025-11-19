import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Shield, Building, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TenantSettings() {
  const [certificate, setCertificate] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const onDropCertificate = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCertificate(acceptedFiles[0]);
    }
  };

  const onDropLogo = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setLogo(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  const { getRootProps: getRootPropsCert, getInputProps: getInputPropsCert, isDragActive: isDragActiveCert } = useDropzone({
    onDrop: onDropCertificate,
    accept: { 'application/x-pkcs12': ['.pfx', '.p12'] },
    maxFiles: 1,
  });

  const { getRootProps: getRootPropsLogo, getInputProps: getInputPropsLogo, isDragActive: isDragActiveLogo } = useDropzone({
    onDrop: onDropLogo,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg'] },
    maxFiles: 1,
    maxSize: 2097152, // 2MB
  });

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie as configurações da sua empresa</p>
      </div>

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
                  <ImageIcon className="w-5 h-5 mr-2 text-primary"/>
                  Logo da Empresa
                </h3>
                <div className="p-6 border-2 border-dashed rounded-lg">
                  {!logo ? (
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
                          <div>
                            <p className="font-medium">{logo.name}</p>
                            <p className="text-sm text-gray-500">{(logo.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={removeLogo}>
                          <X className="w-5 h-5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados Cadastrais */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-primary"/>
                  Dados Cadastrais
                </h3>
                <div className="space-y-6">
                  {/* CNPJ - Primeiro campo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input id="cnpj" defaultValue="12.345.678/0001-99" placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="company-name">Razão Social *</Label>
                      <Input id="company-name" defaultValue="Farmácia Central LTDA" placeholder="Razão social da empresa" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="trading-name">Nome Fantasia</Label>
                      <Input id="trading-name" placeholder="Nome fantasia" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state-registration">Inscrição Estadual</Label>
                      <Input id="state-registration" placeholder="123.456.789.012" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="municipal-registration">Inscrição Municipal</Label>
                      <Input id="municipal-registration" placeholder="12345678" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-regime">Regime Tributário *</Label>
                      <Select defaultValue="simple_national">
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
                      <Label htmlFor="cep">CEP *</Label>
                      <Input id="cep" placeholder="00000-000" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Rua/Avenida *</Label>
                      <Input id="street" placeholder="Nome da rua" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input id="number" placeholder="123" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input id="complement" placeholder="Sala, Andar, etc" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input id="neighborhood" placeholder="Nome do bairro" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input id="city" placeholder="Nome da cidade" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AC">Acre</SelectItem>
                          <SelectItem value="AL">Alagoas</SelectItem>
                          <SelectItem value="AP">Amapá</SelectItem>
                          <SelectItem value="AM">Amazonas</SelectItem>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="CE">Ceará</SelectItem>
                          <SelectItem value="DF">Distrito Federal</SelectItem>
                          <SelectItem value="ES">Espírito Santo</SelectItem>
                          <SelectItem value="GO">Goiás</SelectItem>
                          <SelectItem value="MA">Maranhão</SelectItem>
                          <SelectItem value="MT">Mato Grosso</SelectItem>
                          <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="PA">Pará</SelectItem>
                          <SelectItem value="PB">Paraíba</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="PE">Pernambuco</SelectItem>
                          <SelectItem value="PI">Piauí</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          <SelectItem value="RO">Rondônia</SelectItem>
                          <SelectItem value="RR">Roraima</SelectItem>
                          <SelectItem value="SC">Santa Catarina</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="SE">Sergipe</SelectItem>
                          <SelectItem value="TO">Tocantins</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Input id="phone" placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Celular/WhatsApp</Label>
                    <Input id="mobile" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Principal *</Label>
                    <Input id="email" type="email" placeholder="contato@empresa.com.br" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-nfe">E-mail para NFe</Label>
                    <Input id="email-nfe" type="email" placeholder="nfe@empresa.com.br" />
                  </div>
                </div>
              </div>

              {/* Certificado Digital */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-primary"/>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <File className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{certificate.name}</p>
                          <p className="text-sm text-gray-500">{(certificate.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setCertificate(null)}>
                        <X className="w-5 h-5 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                {certificate && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="cert-password">Senha do Certificado *</Label>
                    <Input id="cert-password" type="password" placeholder="Digite a senha do seu certificado digital"/>
                  </div>
                )}
              </div>

              {/* Configurações SEFAZ */}
              <div>
                <h3 className="text-lg font-medium mb-4">Configurações SEFAZ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="csc-id">CSC ID</Label>
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
                    <Input id="csc-id" placeholder="Ex: 1" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="csc-token">CSC Token</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Código de Segurança do Contribuinte. Uma sequência alfanumérica fornecida pela SEFAZ, usada para aumentar a segurança na emissão de NFe/NFCe.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input id="csc-token" type="password" placeholder="Ex: A1B2C3D4E5..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sefaz-environment">Ambiente SEFAZ *</Label>
                    <Select defaultValue="homologacao">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ambiente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button>Salvar Alterações</Button>
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

              <div>
                <h3 className="text-lg font-medium mb-4">Comportamento</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-page">Página Inicial Padrão</Label>
                    <Select defaultValue="dashboard">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a página inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="orders">Pedidos</SelectItem>
                        <SelectItem value="products">Produtos</SelectItem>
                        <SelectItem value="inventory">Estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="items-per-page">Itens por Página</Label>
                    <Select defaultValue="20">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione quantidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 itens</SelectItem>
                        <SelectItem value="20">20 itens</SelectItem>
                        <SelectItem value="50">50 itens</SelectItem>
                        <SelectItem value="100">100 itens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Segurança</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-logout">Logout Automático</Label>
                      <p className="text-sm text-muted-foreground">Encerrar sessão após período de inatividade</p>
                    </div>
                    <Input type="checkbox" id="auto-logout" className="w-4 h-4" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Tempo de Inatividade (minutos)</Label>
                    <Input id="session-timeout" type="number" defaultValue="30" min="5" max="120" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button>Salvar Alterações</Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
