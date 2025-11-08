import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Package, ShoppingCart, Warehouse, Users, Banknote, FileText, Route, Shield } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
}

interface PermissionsManagerProps {
  user: User;
}

const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: Package, actions: ['view'] },
  { id: 'products', name: 'Produtos', icon: Package, actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'orders', name: 'Pedidos', icon: ShoppingCart, actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'inventory', name: 'Estoque', icon: Warehouse, actions: ['view', 'create', 'edit'] },
  { id: 'clients', name: 'Clientes', icon: Users, actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'financials', name: 'Financeiro', icon: Banknote, actions: ['view', 'create', 'edit'] },
  { id: 'nfe', name: 'NFe', icon: FileText, actions: ['view', 'create', 'delete'] },
  { id: 'routes', name: 'Entregas', icon: Route, actions: ['view', 'create', 'edit'] },
  { id: 'compliance', name: 'Conformidade', icon: Shield, actions: ['view'] },
  { id: 'users', name: 'Usuários', icon: Users, actions: ['view', 'create', 'edit', 'delete'] },
];

const actionLabels: { [key: string]: string } = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

export default function PermissionsManager({ user }: PermissionsManagerProps) {
  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Gerenciar Permissões</DialogTitle>
        <DialogDescription>
          Defina o que <span className="font-bold text-primary">{user.name}</span> ({user.role}) pode acessar e fazer no sistema.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Módulo</TableHead>
              <TableHead className="text-center">Visualizar</TableHead>
              <TableHead className="text-center">Criar</TableHead>
              <TableHead className="text-center">Editar</TableHead>
              <TableHead className="text-center">Excluir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <module.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{module.name}</span>
                  </div>
                </TableCell>
                {['view', 'create', 'edit', 'delete'].map((action) => (
                  <TableCell key={action} className="text-center">
                    {module.actions.includes(action) ? (
                      <Checkbox
                        id={`${user.id}-${module.id}-${action}`}
                        aria-label={`${actionLabels[action]} em ${module.name}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Permissões</Button>
      </DialogFooter>
    </DialogContent>
  );
}
