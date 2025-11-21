import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building,
  Plus,
  Search,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import EditTenantModal from '@/components/superadmin/modals/EditTenantModal';
import ToggleTenantStatusModal from '@/components/superadmin/modals/ToggleTenantStatusModal';
import ExtendSubscriptionModal from '@/components/superadmin/modals/ExtendSubscriptionModal';
import superadminService, { type SuperadminTenant } from '@/services/superadmin.service';
import { useToast } from '@/hooks/use-toast';

export default function TenantManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<SuperadminTenant | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isToggleStatusOpen, setIsToggleStatusOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SuperadminTenant[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const res = await superadminService.listTenants({ page, limit, status: statusFilter || undefined, plan: planFilter || undefined });
      setItems(res.tenants);
      setPages(res.pagination.pages);
      setTotal(res.pagination.total);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao carregar tenants', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit, statusFilter, planFilter]);

  const handleEdit = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedTenant(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const handleToggleStatus = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setIsToggleStatusOpen(true);
  };

  const handleExtendSubscription = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setIsExtendOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      case 'trial': return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredTenants = useMemo(() => items.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpj.includes(searchTerm)
  ), [items, searchTerm]);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Tenants</h1>
          <p className="text-gray-600 mt-1">Administre as empresas que utilizam o sistema</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Tenant
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Lista de Tenants</CardTitle>
                  <CardDescription>{loading ? 'Carregando...' : `${total} tenants encontrados`}</CardDescription>
              </div>
              <div className="w-full max-w-sm">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v === 'all' ? '' : v); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Plano</span>
                <Input value={planFilter} onChange={(e) => { setPage(1); setPlanFilter(e.target.value); }} placeholder="Filtrar plano (texto)" className="w-[220px]" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Por página</span>
                <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(Number(v)); }}>
                  <SelectTrigger className="w-[100px]"><SelectValue placeholder={String(limit)} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-lg"><Building className="h-5 w-5 text-gray-600" /></div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-gray-500">{tenant.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{tenant.cnpj}</TableCell>
                  <TableCell><Badge variant="outline">{tenant.plan}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{tenant.userCount ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.subscriptionEnd ? (
                      <div className="text-sm">
                        <div className={tenant.daysRemaining !== null && tenant.daysRemaining < 30 ? 'text-orange-600 font-medium' : tenant.daysRemaining !== null && tenant.daysRemaining < 0 ? 'text-red-600 font-medium' : ''}>
                          {tenant.daysRemaining !== null && tenant.daysRemaining < 0 
                            ? 'Expirado'
                            : tenant.daysRemaining !== null
                            ? `${tenant.daysRemaining}d restantes`
                            : '-'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tenant.subscriptionEnd).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button asChild variant="ghost" size="sm" title="Ver detalhes"><Link to={`/superadmin/tenants/${tenant.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tenant)} title="Editar"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExtendSubscription(tenant)} title="Estender licença">
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(tenant)} title={tenant.status === 'active' ? 'Desativar' : 'Ativar'}>
                        {tenant.status === 'active' ? <ToggleLeft className="h-4 w-4 text-red-500"/> : <ToggleRight className="h-4 w-4 text-green-500"/>}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Página {page} de {pages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Próxima</Button>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditTenantModal tenant={selectedTenant} mode={editMode} onSaved={load} onClose={() => setIsEditOpen(false)} />
      </Dialog>

      <ToggleTenantStatusModal tenant={selectedTenant} open={isToggleStatusOpen} onOpenChange={setIsToggleStatusOpen} onToggled={load} />
      
      <ExtendSubscriptionModal tenant={selectedTenant} open={isExtendOpen} onOpenChange={setIsExtendOpen} onExtended={load} />
    </>
  );
}
