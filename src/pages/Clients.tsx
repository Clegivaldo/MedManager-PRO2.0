import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import ClientDetailsModal from '@/components/tenant/modals/ClientDetailsModal';
import EditClientModal from '@/components/tenant/modals/EditClientModal';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';
import customerService, { Customer } from '@/services/customer.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Customer[]>([]);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await customerService.list({
        page,
        limit: 50,
        search: searchTerm || undefined,
        status: 'active',
      });
      setClients(response.customers || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ CORREÇÃO: Só carregar dados após autenticação estar completa
    if (!authLoading && isAuthenticated) {
      loadClients();
    }
  }, [page, searchTerm, authLoading, isAuthenticated]);

  const handleViewDetails = (client: Customer) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleEdit = (client: Customer) => {
    setSelectedClient(client);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedClient(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.isActive) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inativo</Badge>;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-600 mt-1">Cadastre e gerencie sua carteira de clientes</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, CNPJ, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Carteira de Clientes</CardTitle>
          <CardDescription>{total} clientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={6} />
          ) : clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <Building2 className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{client.companyName}</p>
                          <p className="text-sm text-gray-500">{client.tradeName || client.companyName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{client.cnpjCpf}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span>{client.city}/{client.state}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(client)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(client)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Nenhum cliente encontrado"
              description="Não há clientes cadastrados no sistema."
              action={<Button onClick={handleCreate}>Adicionar Primeiro Cliente</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <ClientDetailsModal client={selectedClient} />
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditClientModal client={selectedClient} mode={editMode} />
      </Dialog>
    </>
  );
}
