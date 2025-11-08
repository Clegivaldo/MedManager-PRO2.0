import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Eye
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import NewTransactionModal from '@/components/tenant/modals/NewTransactionModal';
import FinancialTransactionDetailsModal from '@/components/tenant/modals/FinancialTransactionDetailsModal';

const cashFlowData = [
  { month: 'Jun', revenue: 4000, expense: 2400 },
  { month: 'Jul', revenue: 3000, expense: 1398 },
  { month: 'Ago', revenue: 9800, expense: 2000 },
  { month: 'Set', revenue: 3908, expense: 2780 },
  { month: 'Out', revenue: 4800, expense: 1890 },
  { month: 'Nov', revenue: 3800, expense: 2390 },
];

export default function Financials() {
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const accountsReceivable = [
    { id: 'REC-001', client: 'Drogaria São Paulo', dueDate: '2024-12-07', value: 12450.00, status: 'Pendente' },
    { id: 'REC-002', client: 'Farmácia Popular', dueDate: '2024-11-20', value: 8750.00, status: 'Atrasado' },
    { id: 'REC-003', client: 'Rede Bem Estar', dueDate: '2024-11-15', value: 25300.00, status: 'Pago' },
  ];

  const accountsPayable = [
    { id: 'PAG-001', supplier: 'Fornecedor A', dueDate: '2024-11-30', value: 35000.00, status: 'Pendente' },
    { id: 'PAG-002', supplier: 'Fornecedor B', dueDate: '2024-11-10', value: 15200.00, status: 'Pago' },
  ];

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente': return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'Pago': return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'Atrasado': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600 mt-1">Controle suas contas a pagar, receber e fluxo de caixa</p>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lançamento
                </Button>
            </DialogTrigger>
            <NewTransactionModal />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 450.123,45</div>
            <p className="text-xs text-muted-foreground">Atualizado hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber (30d)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 120.500,00</div>
            <p className="text-xs text-muted-foreground">Total de 15 contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar (30d)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ 85.300,00</div>
            <p className="text-xs text-muted-foreground">Total de 8 contas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivable">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Contas a Receber</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {accountsReceivable.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.id}</TableCell>
                      <TableCell>{item.client}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>R$ {item.value.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Contas a Pagar</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {accountsPayable.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.id}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>R$ {item.value.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cashflow" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Fluxo de Caixa Mensal</CardTitle>
                    <CardDescription>Visualização de receitas e despesas nos últimos 6 meses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" name="Receitas" fill="var(--color-green)" />
                            <Bar dataKey="expense" name="Despesas" fill="var(--color-red)" />
                            <Line type="monotone" dataKey="revenue" name="Receitas" stroke="var(--color-green)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <FinancialTransactionDetailsModal transaction={selectedTransaction} />
      </Dialog>
    </>
  );
}
