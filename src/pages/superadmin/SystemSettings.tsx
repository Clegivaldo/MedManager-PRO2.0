import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SystemSettings() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600 mt-1">Ajustes globais e integrações do MedManager-PRO</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>
        <Card className="mt-4 border-0 shadow-sm">
          <TabsContent value="general">
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Ajustes de funcionamento do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="maintenance-mode" className="font-semibold">Modo Manutenção</Label>
                <Switch id="maintenance-mode" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system-name">Nome do Sistema</Label>
                <Input id="system-name" defaultValue="MedManager-PRO" />
              </div>
            </CardContent>
          </TabsContent>
          <TabsContent value="integrations">
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>Gerencie chaves de API e serviços de terceiros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nfe-api-key">API Key (Emissão de NFe)</Label>
                <Input id="nfe-api-key" type="password" defaultValue="**************" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maps-api-key">API Key (Google Maps)</Label>
                <Input id="maps-api-key" type="password" defaultValue="**************" />
              </div>
            </CardContent>
          </TabsContent>
          <TabsContent value="notifications">
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configurações do servidor de e-mail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Servidor SMTP</Label>
                <Input id="smtp-host" placeholder="smtp.example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuário SMTP</Label>
                <Input id="smtp-user" placeholder="seu-usuario" />
              </div>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
      <div className="mt-6 flex justify-end">
        <Button>Salvar Alterações</Button>
      </div>
    </>
  );
}
