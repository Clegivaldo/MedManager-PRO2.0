import { useState } from 'react';
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

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const orders = [
    {
      id: '#PED-2024-001',
      client: 'Drogaria São Paulo',
      clientCode: 'CLI-001',
      date: '2024-11-07',
      status: 'processando',
      items: 15,
      totalValue: 12450.00,
      paymentMethod: 'Boleto',
      deliveryDate: '2024-11-10',
      prescription: true,
      priority: 'normal'
    },
    {
      id: '#PED-2024-002',
      client: 'Farmácia Popular',
      clientCode: 'CLI-002',
      date: '2024-11-06',
      status: 'enviado',
      items: 8,
      totalValue: 8750.00,
      paymentMethod: 'PIX',
      deliveryDate: '2024-11-08',
      prescription: false,
      priority: 'alta'
    },
    {
      id: '#PED-2024-003',
      client: 'Rede Bem Estar',
      clientCode: 'CLI-003',
      date: '2024-11-05',
      status: 'entregue',
      items: 32,
      totalValue: 25300.00,
      paymentMethod: 'Cartão',
      deliveryDate: '2024-11-07',
      prescription: true,
      priority: 'normal'
    },
    {
      id: '#PED-2024-004',
      client: 'Farmácia Central',
      clientCode: 'CLI-004',
      date: '2024-11-07',
      status: 'pendente',
      items: 5,
      totalValue: 3200.00,
      paymentMethod: 'Boleto',
      deliveryDate: '2024-11-12',
      prescription: true,
      priority: 'urgente'
    }
  ];

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pendente</Badge>;
      case 'processando':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processando</Badge>;
      case 'enviado':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'entregue':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Entregue</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Alta</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Normal</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="h-4 w-4 text-gray-600" />;
      case 'processando': return <Package className="h-4 w-4 text-yellow-600" />;
      case 'enviado': return <Truck className="h-4 w-4 text-blue-600" />;
      case 'entregue': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelado': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Pedidos</h1>
          <p className="text-gray-600 mt-1">Controle completo de vendas e entregas</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <NewOrderModal />
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* ... cards ... */}
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
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            {filteredOrders.length} pedidos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
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
                        <p className="text-sm text-gray-500">{order.clientCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{order.client}</span>
                      {order.prescription && (
                        <FileText className="h-4 w-4 text-blue-600" title="Requer Prescrição" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{order.date}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell className="text-center">{order.items}</TableCell>
                  <TableCell className="font-medium">
                    R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm">{order.deliveryDate}</TableCell>
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
