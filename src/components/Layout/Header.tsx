import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, User, LogOut, Settings, HelpCircle, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="border-b bg-card px-6 py-4 dark:bg-background">
      <div className="flex items-center justify-between">
        {/* Busca Global */}
        <div className="flex items-center space-x-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos, pedidos, clientes..."
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Status e Ações */}
        <div className="flex items-center space-x-2">
          {/* Status de Conformidade */}
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Conforme ANVISA
            </Badge>
          </div>

          {/* Theme Selector */}
          <ThemeSelector />

          {/* Notificações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-10 w-10 p-0">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start p-3">
                <div className="font-medium text-sm">Estoque Baixo</div>
                <div className="text-xs text-gray-500">Paracetamol 500mg - 12 unidades restantes</div>
                <div className="text-xs text-gray-400 mt-1">há 2 horas</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start p-3">
                <div className="font-medium text-sm">Guia 33 Pendente</div>
                <div className="text-xs text-gray-500">Transporte #G33-2024-001 aguarda aprovação</div>
                <div className="text-xs text-gray-400 mt-1">há 4 horas</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start p-3">
                <div className="font-medium text-sm">NFe Processada</div>
                <div className="text-xs text-gray-500">Nota fiscal #001234 emitida com sucesso</div>
                <div className="text-xs text-gray-400 mt-1">há 6 horas</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/avatars/user.jpg" alt="Usuário" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'Usuário'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  {user?.tenantId && (
                    <p className="text-xs leading-none text-muted-foreground">Tenant: {user.tenantId}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/users">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/fiscal-profile">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Perfil Fiscal</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Suporte</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-500 focus:bg-red-100/80"
                onClick={() => {
                  try {
                    logout();
                    navigate('/login');
                  } catch (e) {
                    console.error('Erro ao sair', e);
                  }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
