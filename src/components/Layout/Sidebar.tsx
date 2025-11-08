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
  Bell,
  ChevronLeft,
  ChevronRight,
  Activity,
  Thermometer,
  Truck,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    badge: null
  },
  {
    title: 'Produtos',
    icon: Package,
    href: '/products',
    badge: null
  },
  {
    title: 'Estoque',
    icon: Warehouse,
    href: '/inventory',
    badge: { text: '12', variant: 'destructive' as const }
  },
  {
    title: 'Pedidos',
    icon: ShoppingCart,
    href: '/orders',
    badge: { text: '5', variant: 'default' as const }
  },
  {
    title: 'NFe',
    icon: FileText,
    href: '/nfe',
    badge: null
  },
  {
    title: 'Conformidade',
    icon: Shield,
    href: '/compliance',
    badge: { text: '3', variant: 'secondary' as const }
  },
  {
    title: 'Clientes',
    icon: Users,
    href: '/clients',
    badge: null
  }
];

const complianceItems = [
  {
    title: 'Guia 33',
    icon: Truck,
    href: '/compliance/guia33',
    badge: { text: '2', variant: 'default' as const }
  },
  {
    title: 'Temperatura',
    icon: Thermometer,
    href: '/compliance/temperature',
    badge: null
  },
  {
    title: 'Qualidade',
    icon: Activity,
    href: '/compliance/quality',
    badge: null
  },
  {
    title: 'Alertas',
    icon: AlertTriangle,
    href: '/compliance/alerts',
    badge: { text: '7', variant: 'destructive' as const }
  }
];

export default function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      'flex flex-col border-r bg-white transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">MedManager-PRO</h2>
              <p className="text-xs text-gray-500">Farmácia Central</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Menu Principal */}
          {!collapsed && (
            <div className="px-2 py-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Menu Principal
              </h3>
            </div>
          )}
          
          {menuItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                'w-full justify-start h-10',
                collapsed ? 'px-2' : 'px-3'
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

          {/* Conformidade ANVISA */}
          {!collapsed && (
            <div className="px-2 py-3 pt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ANVISA
              </h3>
            </div>
          )}
          
          {complianceItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                'w-full justify-start h-10',
                collapsed ? 'px-2' : 'px-3'
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
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-10',
            collapsed ? 'px-2' : 'px-3'
          )}
          asChild
        >
          <a href="/settings">
            <Settings className={cn('h-5 w-5', !collapsed && 'mr-3')} />
            {!collapsed && <span>Configurações</span>}
          </a>
        </Button>
      </div>
    </div>
  );
}