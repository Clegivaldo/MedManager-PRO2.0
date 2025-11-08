import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Shield } from 'lucide-react';
import { useState } from 'react';

export default function TenantSettings() {
  const [certificate, setCertificate] = useState<File | null>(null);
  
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCertificate(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/x-pkcs12': ['.pfx', '.p12'] },
    maxFiles: 1,
  });

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie as configurações da sua empresa</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Empresa e NFe</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>
        
        <Card className="mt-4 border-0 shadow-sm">
          <TabsContent value="company">
            <CardHeader>
              <CardTitle>Dados da Empresa e Nota Fiscal</CardTitle>
              <CardDescription>Informações para faturamento e emissão de NFe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Razão Social</Label>
                  <Input id="company-name" defaultValue="Farmácia Central LTDA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="12.345.678/0001-99" disabled />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary"/>
                    Certificado Digital A1
                </h3>
                <div className="p-6 border-2 border-dashed rounded-lg">
                  {!certificate ? (
                    <div {...getRootProps()} className="cursor-pointer text-center">
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center justify-center space-y-2 text-gray-500">
                        <UploadCloud className="w-12 h-12" />
                        {isDragActive ? (
                          <p>Solte o arquivo aqui...</p>
                        ) : (
                          <p>Arraste e solte o arquivo .pfx ou .p12 aqui, ou clique para selecionar.</p>
                        )}
                        <p className="text-xs">O certificado é armazenado de forma segura e usado apenas para assinar as NFes.</p>
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
                        <Label htmlFor="cert-password">Senha do Certificado</Label>
                        <Input id="cert-password" type="password" placeholder="Digite a senha do seu certificado digital"/>
                    </div>
                )}
              </div>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="users">
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>Em desenvolvimento.</CardDescription>
            </CardHeader>
          </TabsContent>
          
          <TabsContent value="preferences">
             <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>Em desenvolvimento.</CardDescription>
            </CardHeader>
          </TabsContent>
        </Card>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button>Salvar Alterações</Button>
      </div>
    </>
  );
}
