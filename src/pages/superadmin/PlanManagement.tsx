import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DollarSign, Truck, LineChart, Bot, Package, FileText, Banknote, Route, Shield, Users, Warehouse } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function PlanManagement() {
  const allModules = [
    { id: 'dashboard', name: 'Dashboard', icon: LineChart, core: true },
    { id: 'products', name: 'Gestão de Produtos', icon: Package, core: true },
    { id: 'inventory', name: 'Gestão de Estoque', icon: Warehouse, core: true },
    { id: 'orders', name: 'Gestão de Pedidos', icon: Package, core: true },
    { id: 'clients', name: 'Gestão de Clientes', icon: Users, core: true },
    { id: 'compliance', name: 'Conformidade ANVISA', icon: Shield, core: true },
    { id: 'nfe', name: 'Emissão de NFe', icon: FileText, optional: true },
    { id: 'finance', name: 'Financeiro Completo', icon: Banknote, optional: true },
    { id: 'routes', name: 'Otimização de Rotas', icon: Route, optional: true },
    { id: 'bi', name: 'BI Avançado', icon: LineChart, optional: true },
    { id: 'automation', name: 'Automação com IA', icon: Bot, optional: true },
  ];

  const plans = [
    {
      name: 'Básico',
      price: 'R$ 299',
      description: 'Ideal para pequenas distribuidoras começando a operar.',
      modules: ['dashboard', 'products', 'inventory', 'orders', 'clients', 'compliance', 'nfe'],
      color: 'border-gray-300'
    },
    {
      name: 'Profissional',
      price: 'R$ 599',
      description: 'Para empresas em crescimento que precisam de mais automação.',
      modules: ['dashboard', 'products', 'inventory', 'orders', 'clients', 'compliance', 'nfe', 'finance', 'routes'],
      color: 'border-primary',
      recommended: true
    },
    {
      name: 'Enterprise',
      price: 'Customizado',
      description: 'Soluções completas para grandes operações e necessidades específicas.',
      modules: ['dashboard', 'products', 'inventory', 'orders', 'clients', 'compliance', 'nfe', 'finance', 'routes', 'bi', 'automation'],
      color: 'border-purple-500'
    },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Planos</h1>
        <p className="text-gray-600 mt-1">Configure os planos de assinatura e os módulos inclusos em cada um</p>
      </div>

       <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Como os planos funcionam?</AlertTitle>
        <AlertDescription>
          Use esta tela para montar os pacotes de funcionalidades. Marque os módulos que cada plano terá acesso. Depois, na tela de <a href="/superadmin/tenants" className="font-semibold text-primary underline">Gerenciamento de Tenants</a>, você poderá atribuir um desses planos a cada empresa.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <Card key={index} className={`flex flex-col ${plan.color} ${plan.recommended ? 'border-2 shadow-lg' : 'shadow-sm'}`}>
            {plan.recommended && <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-1 rounded-t-lg -m-px">RECOMENDADO</div>}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-4xl font-bold text-foreground">{plan.price}<span className="text-lg font-normal text-muted-foreground">/mês</span></div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <h4 className="font-semibold mb-4 text-foreground">Módulos Inclusos:</h4>
              <div className="space-y-4">
                {allModules.map((module) => (
                  <div key={module.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`${plan.name}-${module.id}`}
                      checked={plan.modules.includes(module.id)}
                      disabled={module.core}
                      aria-label={module.name}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={`${plan.name}-${module.id}`} className={`flex items-center gap-2 font-medium ${module.core ? 'text-muted-foreground' : 'text-foreground'}`}>
                        <module.icon className="h-4 w-4" />
                        {module.name}
                      </Label>
                      {module.core && <p className="text-xs text-muted-foreground">Módulo essencial</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.recommended ? 'default' : 'outline'}>
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
