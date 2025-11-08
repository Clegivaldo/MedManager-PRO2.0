import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Truck, LineChart, Bot, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ToggleModuleModal from '@/components/superadmin/modals/ToggleModuleModal';
import { toast } from 'sonner';

export default function ModuleManagement() {
  const [modules, setModules] = useState({
    finance: true,
    routes: false,
    bi: false,
    automation: false,
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<{id: string, name: string, active: boolean} | null>(null);

  const coreModules = [
    { id: 'dashboard', name: 'Dashboard', description: 'Visão geral e métricas principais.', icon: LineChart, active: true, core: true },
    { id: 'products', name: 'Gestão de Produtos', description: 'Catálogo de produtos farmacêuticos.', icon: Package, active: true, core: true },
    { id: 'orders', name: 'Gestão de Pedidos', description: 'Controle de vendas e entregas.', icon: Package, active: true, core: true },
    { id: 'compliance', name: 'Conformidade ANVISA', description: 'Monitoramento regulatório.', icon: Shield, active: true, core: true },
  ];

  const optionalModules = [
    { id: 'finance', name: 'Financeiro Completo', description: 'Contas a pagar, receber e fluxo de caixa.', icon: DollarSign, active: modules.finance },
    { id: 'routes', name: 'Otimização de Rotas', description: 'Planejamento e acompanhamento de entregas.', icon: Truck, active: modules.routes },
    { id: 'bi', name: 'BI Avançado', description: 'Dashboards e relatórios de inteligência de negócio.', icon: LineChart, active: modules.bi },
    { id: 'automation', name: 'Automação com IA', description: 'Sugestões de compra e otimizações automáticas.', icon: Bot, active: modules.automation },
  ];

  const handleToggle = (moduleId: string, moduleName: string, currentStatus: boolean) => {
    setSelectedModule({ id: moduleId, name: moduleName, active: currentStatus });
    setIsConfirmOpen(true);
  };

  const onConfirmToggle = () => {
    if (selectedModule) {
      setModules(prev => ({ ...prev, [selectedModule.id]: !selectedModule.active }));
      toast.success(`Módulo '${selectedModule.name}' foi ${!selectedModule.active ? 'ativado' : 'desativado'}.`);
    }
    setIsConfirmOpen(false);
    setSelectedModule(null);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Módulos</h1>
        <p className="text-gray-600 mt-1">Ative ou desative módulos opcionais para toda a plataforma</p>
      </div>

      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona o gerenciamento de módulos?</AlertTitle>
        <AlertDescription>
          Esta página controla a disponibilidade de módulos em toda a plataforma. Para atribuir módulos a um tenant específico, configure os <a href="/superadmin/plans" className="font-semibold text-primary underline">Planos de Assinatura</a>.
        </AlertDescription>
      </Alert>

      <div className="space-y-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Módulos Essenciais</CardTitle>
            <CardDescription>Estes módulos são parte do núcleo do sistema e não podem ser desativados.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreModules.map((module) => (
              <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
                <div className="flex items-center space-x-4">
                  <div className="bg-background p-3 rounded-lg border">
                    <module.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{module.name}</h3>
                    <p className="text-sm text-gray-500">{module.description}</p>
                  </div>
                </div>
                <Switch id={`module-${module.id}`} checked={true} disabled />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Módulos Opcionais</CardTitle>
            <CardDescription>Ative ou desative módulos que podem ser incluídos nos planos de assinatura.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {optionalModules.map((module) => (
              <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-background p-3 rounded-lg border">
                    <module.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{module.name}</h3>
                    <p className="text-sm text-gray-500">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={module.active ? 'secondary' : 'outline'} className={module.active ? 'bg-green-100 text-green-800' : ''}>
                    {module.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Switch
                    id={`module-${module.id}`}
                    checked={module.active}
                    onCheckedChange={() => handleToggle(module.id, module.name, module.active)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <ToggleModuleModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={onConfirmToggle}
        module={selectedModule}
      />
    </>
  );
}
