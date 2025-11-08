import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import {
  Building,
  Plus,
  Search,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import EditTenantModal from '@/components/superadmin/modals/EditTenantModal';
import ToggleTenantStatusModal from '@/components/superadmin/modals/ToggleTenantStatusModal';

export default function TenantManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isToggleStatusOpen, setIsToggleStatusOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const tenants = [
    { id: 'TEN-001', name: 'Farmácia Central LTDA', cnpj: '12.345.678/0001-99', plan: 'Profissional', status: 'active' },
    { id: 'TEN-002', name: 'Drogaria Pacheco S/A', cnpj: '33.438.250/0001-20', plan: 'Enterprise', status: 'active' },
    { id: 'TEN-003', name: 'Farma Conde', cnpj: '03.563.014/0001-15', plan: 'Básico', status: 'inactive' },
    { id: 'TEN-004', name: 'Ultrafarma', cnpj: '02.543.945/0001-21', plan: 'Profissional', status: 'trial' },
  ];

  const handleEdit = (tenant: any) => {
    setSelectedTenant(tenant);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedTenant(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const handleToggleStatus = (tenant: any) => {
    setSelectedTenant(tenant);
    setIsToggleStatusOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      case 'trial': return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpj.includes(searchTerm)
  );

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
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Lista de Tenants</CardTitle>
                <CardDescription>{filteredTenants.length} tenants encontrados</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button asChild variant="ghost" size="sm"><Link to={`/superadmin/tenants/${tenant.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tenant)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(tenant)}>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditTenantModal tenant={selectedTenant} mode={editMode} />
      </Dialog>

      <ToggleTenantStatusModal tenant={selectedTenant} open={isToggleStatusOpen} onOpenChange={setIsToggleStatusOpen} />
    </>
  );
}
