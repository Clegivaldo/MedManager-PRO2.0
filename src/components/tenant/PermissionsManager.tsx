import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Package, ShoppingCart, Warehouse, Users, Banknote, FileText, Route, Shield } from 'lucide-react';

import userMgmtService from '@/services/user-management.service';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  role: string;
}

interface PermissionsManagerProps {
  user: User;
}

// Mapeamento para PERMISSIONS do backend
const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: Package, actions: [{key:'DASHBOARD_VIEW', label:'view'}] },
  { id: 'products', name: 'Produtos', icon: Package, actions: [
    {key:'PRODUCT_READ', label:'view'},
    {key:'PRODUCT_CREATE', label:'create'},
    {key:'PRODUCT_UPDATE', label:'edit'},
    {key:'PRODUCT_DELETE', label:'delete'},
  ] },
  { id: 'orders', name: 'Pedidos', icon: ShoppingCart, actions: [
    {key:'INVOICE_READ', label:'view'},
    {key:'INVOICE_CREATE', label:'create'},
    {key:'INVOICE_UPDATE', label:'edit'},
    {key:'INVOICE_DELETE', label:'delete'},
  ] },
  { id: 'inventory', name: 'Estoque', icon: Warehouse, actions: [
    {key:'INVENTORY_VIEW', label:'view'},
    {key:'INVENTORY_ADJUST', label:'create'},
    {key:'INVENTORY_TRANSFER', label:'edit'},
  ] },
  { id: 'clients', name: 'Clientes', icon: Users, actions: [
    {key:'CUSTOMER_READ', label:'view'},
    {key:'CUSTOMER_CREATE', label:'create'},
    {key:'CUSTOMER_UPDATE', label:'edit'},
    {key:'CUSTOMER_DELETE', label:'delete'},
  ] },
  { id: 'financials', name: 'Financeiro', icon: Banknote, actions: [
    {key:'FINANCIAL_VIEW', label:'view'},
    {key:'FINANCIAL_MANAGE_PAYMENTS', label:'create'},
    {key:'FINANCIAL_MANAGE_RECEIPTS', label:'edit'},
  ] },
  { id: 'nfe', name: 'Fiscal (NF-e)', icon: FileText, actions: [
    {key:'NFE_VIEW_DANFE', label:'view'},
    {key:'NFE_ISSUE', label:'create'},
    {key:'NFE_CANCEL', label:'delete'},
  ] },
  { id: 'routes', name: 'Entregas', icon: Route, actions: [
    {key:'REPORTS_VIEW', label:'view'},
    {key:'REPORTS_CREATE', label:'create'},
    {key:'REPORTS_EXPORT', label:'edit'},
  ] },
  { id: 'compliance', name: 'Conformidade', icon: Shield, actions: [
    {key:'REGULATORY_VIEW', label:'view'}
  ] },
  { id: 'users', name: 'Usuários', icon: Users, actions: [
    {key:'USER_READ', label:'view'},
    {key:'USER_CREATE', label:'create'},
    {key:'USER_UPDATE', label:'edit'},
    {key:'USER_DELETE', label:'delete'},
  ] },
];

const actionLabels: { [key: string]: string } = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

export default function PermissionsManager({ user }: PermissionsManagerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Carregar permissões atuais do usuário
    (async () => {
      try {
        const u = await userMgmtService.getUser(user.id);
        const perms: string[] = (u as any)?.permissions || [];
        setSelected(perms);
      } catch {
        setSelected([]);
      }
    })();
  }, [user.id]);

  const toggle = (perm: string) => {
    setSelected(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleSave = async () => {
    try {
      await userMgmtService.updatePermissions(user.id, selected);
      toast({ title: 'Sucesso', description: 'Permissões atualizadas.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar permissões.', variant: 'destructive' });
    }
  };

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
                {['view', 'create', 'edit', 'delete'].map((action) => {
                  const actionObj = (module.actions as any[]).find(a => a.label === action);
                  return (
                    <TableCell key={action} className="text-center">
                      {actionObj ? (
                        <Checkbox
                          checked={selected.includes(actionObj.key)}
                          onCheckedChange={() => toggle(actionObj.key)}
                          aria-label={`${actionLabels[action]} em ${module.name}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>Salvar Permissões</Button>
      </DialogFooter>
    </DialogContent>
  );
}
