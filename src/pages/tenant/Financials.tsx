import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  LineChart,
  Plus
} from 'lucide-react';

export default function Financials() {
  const accountsReceivable = [
    { id: 'REC-001', client: 'Drogaria São Paulo', dueDate: '2024-12-07', value: 12450.00, status: 'pending' },
    { id: 'REC-002', client: 'Farmácia Popular', dueDate: '2024-11-20', value: 8750.00, status: 'late' },
    { id: 'REC-003', client: 'Rede Bem Estar', dueDate: '2024-11-15', value: 25300.00, status: 'paid' },
  ];

  const accountsPayable = [
    { id: 'PAG-001', supplier: 'Fornecedor A', dueDate: '2024-11-30', value: 35000.00, status: 'pending' },
    { id: 'PAG-002', supplier: 'Fornecedor B', dueDate: '2024-11-10', value: 15200.00, status: 'paid' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'paid': return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'late': return <Badge variant="destructive">Atrasado</Badge>;
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
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
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
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {accountsReceivable.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.id}</TableCell>
                      <TableCell>{item.client}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>R$ {item.value.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
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
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {accountsPayable.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.id}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell>R$ {item.value.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
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
                    <CardTitle>Fluxo de Caixa</CardTitle>
                    <CardDescription>Visualização de entradas e saídas.</CardDescription>
                </CardHeader>
                <CardContent className="h-96 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <LineChart className="h-12 w-12 mx-auto mb-2"/>
                        <p>Gráfico de Fluxo de Caixa em desenvolvimento.</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
