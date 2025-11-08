import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import {
  DollarSign,
  Search,
  Eye,
  FileText,
  CreditCard,
  Receipt
} from 'lucide-react';
import SaleDetailsModal from '@/components/tenant/modals/SaleDetailsModal';

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const sales = [
    {
      id: '#VDA-2024-001',
      orderId: '#PED-2024-001',
      client: 'Drogaria São Paulo',
      date: '2024-11-07',
      total: 12450.00,
      payment: 'Boleto',
      nfeStatus: 'issued',
    },
    {
      id: '#VDA-2024-002',
      orderId: '#PED-2024-002',
      client: 'Farmácia Popular',
      date: '2024-11-06',
      total: 8750.00,
      payment: 'PIX',
      nfeStatus: 'issued',
    },
    {
      id: '#VDA-2024-003',
      orderId: '#PED-2024-003',
      client: 'Rede Bem Estar',
      date: '2024-11-05',
      total: 25300.00,
      payment: 'Cartão',
      nfeStatus: 'pending',
    },
  ];

  const handleViewDetails = (sale: any) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'issued':
        return <Badge className="bg-green-100 text-green-800">Emitida</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600 mt-1">Gerencie as vendas e faturamento da distribuidora</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ 1.250.345,90</div>
                <p className="text-xs text-muted-foreground">+20.1% em relação ao mês passado</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas Realizadas (Mês)</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">+180.1% em relação ao mês passado</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ 532,06</div>
                <p className="text-xs text-muted-foreground">+19% em relação ao mês passado</p>
            </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Registro de Vendas</CardTitle>
                <CardDescription>{filteredSales.length} vendas encontradas</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nº da venda ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status NFe</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <p className="font-mono">{sale.id}</p>
                    <p className="text-xs text-gray-500">Pedido: {sale.orderId}</p>
                  </TableCell>
                  <TableCell className="font-medium">{sale.client}</TableCell>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell>{sale.payment}</TableCell>
                  <TableCell className="font-medium">
                    R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.nfeStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sale)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={sale.nfeStatus !== 'pending'}><FileText className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SaleDetailsModal sale={selectedSale} />
      </Dialog>
    </>
  );
}
