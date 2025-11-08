import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Building,
  Layers,
  Package,
  HeartPulse,
  Settings,
  LogOut,
  DatabaseBackup
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

const menuItems = [
  {
    title: 'Tenants',
    icon: Building,
    href: '/superadmin/tenants',
  },
  {
    title: 'Planos',
    icon: Layers,
    href: '/superadmin/plans',
  },
  {
    title: 'Módulos',
    icon: Package,
    href: '/superadmin/modules',
  },
  {
    title: 'Saúde do Sistema',
    icon: HeartPulse,
    href: '/superadmin/health',
  },
  {
    title: 'Backups',
    icon: DatabaseBackup,
    href: '/superadmin/backups',
  },
  {
    title: 'Configurações',
    icon: Settings,
    href: '/superadmin/settings',
  },
];

export default function SuperadminSidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={cn(
      'flex flex-col border-r bg-gray-900 text-white transition-all duration-300',
      collapsed ? 'w-20' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Super Admin</h2>
              <p className="text-xs text-gray-400">MedManager-PRO</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 text-gray-300 hover:bg-gray-700 hover:text-white"
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
          {menuItems.map((item) => (
            <Button
              key={item.href}
              variant={location.pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start h-10',
                collapsed ? 'px-3' : 'px-3',
                location.pathname.startsWith(item.href) 
                  ? 'bg-red-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
              asChild
            >
              <a href={item.href}>
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.title}</span>
                )}
              </a>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-10 text-gray-300 hover:bg-gray-700 hover:text-white',
            collapsed ? 'px-3' : 'px-3'
          )}
          asChild
        >
          <a href="/login">
            <LogOut className={cn('h-5 w-5', !collapsed && 'mr-3')} />
            {!collapsed && <span>Sair</span>}
          </a>
        </Button>
      </div>
    </div>
  );
}
