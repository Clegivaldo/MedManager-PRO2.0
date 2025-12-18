import { useEffect, useState } from 'react';
import { moduleService, type ModuleListResponse } from '@/services/module.service';
import { superadminService, type SuperadminTenant } from '@/services/superadmin.service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Box, Check, X } from 'lucide-react';

export default function ModuleManagement() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [moduleData, setModuleData] = useState<ModuleListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await superadminService.listTenants({ limit: 100 });
      setTenants(res.tenants);
    } catch (err) {
      toast({ title: 'Erro ao carregar tenants', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const loadModules = async (tenantId: string) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await moduleService.listModules(tenantId);
      setModuleData(data);
    } catch (err) {
      toast({ title: 'Erro ao carregar módulos', description: getErrorMessage(err), variant: 'destructive' });
      setModuleData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTenantId) {
      loadModules(selectedTenantId);
    }
  }, [selectedTenantId]);

  const toggleModule = async (moduleId: string, currentStatus: boolean) => {
    try {
      if (!selectedTenantId) return;

      // Update optimism
      const updatedModules = moduleData?.modules.map(m =>
        m.id === moduleId ? { ...m, enabled: !currentStatus } : m
      );

      if (moduleData && updatedModules) {
        setModuleData({ ...moduleData, modules: updatedModules });
      }

      await moduleService.toggleModule(selectedTenantId, moduleId, !currentStatus);
      toast({ title: `Módulo ${!currentStatus ? 'ativado' : 'desativado'} com sucesso` });
    } catch (err) {
      toast({ title: 'Erro ao alterar módulo', description: getErrorMessage(err), variant: 'destructive' });
      // Revert optimism if error
      loadModules(selectedTenantId);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpj?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Módulos</CardTitle>
          <CardDescription>Ative ou desative módulos opcionais por tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Seleção de Tenant */}
          <div className="flex gap-4 mb-6 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Buscar Tenant</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Selecione o Tenant</label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingTenants ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">Carregando...</div>
                  ) : filteredTenants.length > 0 ? (
                    filteredTenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">Nenhum tenant encontrado</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de Módulos */}
          {selectedTenantId && (
            <div className="mt-8">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : moduleData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                    <div>
                      <h3 className="font-semibold text-lg">{moduleData.tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">Plano Atual: {moduleData.tenant.plan}</p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      {moduleData.modules.filter(m => m.enabled).length} Módulos Ativos
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {moduleData.modules.map(module => (
                      <div
                        key={module.id}
                        className={`
                          flex items-center justify-between p-4 rounded-lg border transition-all
                          ${module.enabled ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/50'}
                        `}
                      >
                        <div className="flex gap-3 items-start">
                          <div className={`p-2 rounded-full ${module.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Box className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {module.name}
                              {module.enabled && <Check className="h-3 w-3 text-green-600" />}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={module.enabled}
                          onCheckedChange={() => toggleModule(module.id, module.enabled)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Selecione um tenant para gerenciar os módulos</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
