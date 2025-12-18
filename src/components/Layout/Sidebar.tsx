import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  FileText,
  Shield,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Route,
  ClipboardList,
  Banknote,
  Users2,
  History,
  Building2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
}

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', module: 'DASHBOARD' },
  { title: 'Pedidos', icon: ShoppingCart, href: '/orders', badge: { text: '5', variant: 'default' as const }, module: 'SALES' },
  { title: 'Orçamentos', icon: ClipboardList, href: '/quotes', module: 'SALES' },
  { title: 'Vendas', icon: DollarSign, href: '/sales', module: 'SALES' },
  { title: 'Produtos', icon: Package, href: '/products', module: 'PRODUCTS' },
  { title: 'Estoque', icon: Warehouse, href: '/inventory', badge: { text: '12', variant: 'destructive' as const }, module: 'INVENTORY' },
  { title: 'Clientes', icon: Users, href: '/clients', module: 'SALES' },
  { title: 'Financeiro', icon: Banknote, href: '/financials', module: 'FINANCIAL' },
  { title: 'NFe', icon: FileText, href: '/nfe', module: 'NFE' },
  { title: 'Entregas', icon: Route, href: '/routes', module: 'ROUTES' },
  { title: 'Conformidade', icon: Shield, href: '/compliance', badge: { text: '3', variant: 'secondary' as const }, module: 'COMPLIANCE' },
];

const baseManagementItems = [
  { title: 'Perfil Fiscal', icon: Building2, href: '/fiscal-profile', module: 'NFE' },
  { title: 'Usuários', icon: Users2, href: '/users' },
  { title: 'Auditoria', icon: History, href: '/audit', module: 'AUDIT' },
];

export default function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, tenant } = useAuth(); // Agora usamos também o tenant
  const role = (user?.role || '').toUpperCase();
  const isSuperOrMaster = role === 'SUPERADMIN' || role === 'MASTER';

  // Função auxiliar para verificar se módulo está habilitado
  const hasModule = (moduleName?: string) => {
    if (!moduleName) return true; // Se não requer módulo, mostra
    if (isSuperOrMaster) return true; // SuperAdmin vê tudo
    const modules = tenant?.modulesEnabled || [];
    return modules.includes(moduleName);
  };

  const visibleMenuItems = menuItems.filter(item => hasModule(item.module));

  const managementItems = (() => {
    let base = baseManagementItems.filter(item => hasModule(item.module));

    // Mostrar Jobs do Sistema apenas para ADMIN ou SUPERADMIN
    if (role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MASTER') {
      base.push({ title: 'Jobs do Sistema', icon: Settings, href: '/system-jobs' } as any);
    }
    // Gateways Pagamento apenas para MASTER/SUPERADMIN
    if (role === 'MASTER' || role === 'SUPERADMIN') {
      base.push({ title: 'Gateways Pagamento', icon: Settings, href: '/payment-gateway-config' } as any);
    }
    return base;
  })();

  return (
    <div className={cn(
      'flex flex-col border-r bg-card transition-all duration-300 dark:bg-background',
      collapsed ? 'w-20' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="bg-primary p-2 rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">MedManager-PRO</h2>
              <p className="text-xs text-muted-foreground">Farmácia Central</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {visibleMenuItems.map((item) => (
            <Button
              key={item.href}
              variant={location.pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start h-10',
                collapsed ? 'px-3' : 'px-3'
              )}
              asChild
            >
              <a href={item.href}>
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="ml-auto">
                        {item.badge.text}
                      </Badge>
                    )}
                  </>
                )}
              </a>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <nav className="space-y-1">
          {managementItems.map((item) => (
            <Button
              key={item.href}
              variant={location.pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start h-10',
                collapsed ? 'px-3' : 'px-3'
              )}
              asChild
            >
              <a href={item.href}>
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                {!collapsed && <span>{item.title}</span>}
              </a>
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
