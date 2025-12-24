import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  Edit,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  User
} from 'lucide-react';
import NewOrderModal from '@/components/tenant/modals/NewOrderModal';
import OrderDetailsModal from '@/components/tenant/modals/OrderDetailsModal';
import EditOrderModal from '@/components/tenant/modals/EditOrderModal';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';
import orderService, { Order } from '@/services/order.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.list({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: selectedStatus !== 'all' ? selectedStatus.toUpperCase() : undefined,
      });
      setOrders(response.data || []);
      setTotal(response.meta?.total || 0);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ CORREÇÃO: Só carregar dados após autenticação estar completa
    if (!authLoading && isAuthenticated) {
      loadOrders();
    }
  }, [page, searchTerm, selectedStatus, authLoading, isAuthenticated]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pendente</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processando</Badge>;
      case 'SHIPPED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'DELIVERED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Entregue</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-gray-600" />;
      case 'PROCESSING': return <Package className="h-4 w-4 text-yellow-600" />;
      case 'SHIPPED': return <Truck className="h-4 w-4 text-blue-600" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredOrders = orders;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Pedidos</h1>
          <p className="text-gray-600 mt-1">Controle completo de vendas e entregas</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <NewOrderModal />
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número do pedido ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PROCESSING">Processando</SelectItem>
                <SelectItem value="SHIPPED">Enviado</SelectItem>
                <SelectItem value="DELIVERED">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            {total} pedidos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={9} />
          ) : filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <p className="font-medium">{order.id}</p>
                          <p className="text-sm text-gray-500">{order.customer?.cnpjCpf || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{order.customer?.companyName || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-center">{order.items?.length || 0}</TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
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
              icon={<ShoppingCart className="h-16 w-16" />}
              title="Nenhum pedido encontrado"
              description="Crie um novo pedido para começar a gerenciar suas vendas."
              action={
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pedido
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <OrderDetailsModal order={selectedOrder} />
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditOrderModal order={selectedOrder} />
      </Dialog>
    </>
  );
}
