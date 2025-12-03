import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, Loader2, Check, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import financialService, { type FinancialTransaction, type CashFlowData } from '@/services/financial.service';
import { createTransactionSchema, type CreateTransactionFormData } from '@/lib/validations/financial';
import { getErrorMessage } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Pago', color: 'bg-green-100 text-green-800' },
  OVERDUE: { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

export default function Financials() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [receivables, setReceivables] = useState<FinancialTransaction[]>([]);
  const [payables, setPayables] = useState<FinancialTransaction[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [summary, setSummary] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    pendingReceivable: 0,
    pendingPayable: 0,
  });
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('receivables');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateTransactionFormData>({
    resolver: zodResolver(createTransactionSchema),
  });

  useEffect(() => {
    loadData();
  }, [page, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingSummary(true);

      const [summaryRes, transactionsRes, cashFlowRes] = await Promise.all([
        financialService.getSummary(),
        financialService.listTransactions({
          page,
          limit: 10,
          type: activeTab === 'receivables' ? 'RECEIVABLE' : 'PAYABLE',
        }),
        financialService.getCashFlow(),
      ]);

      setSummary(summaryRes);

      if (activeTab === 'receivables') {
        setReceivables(transactionsRes.transactions);
      } else {
        setPayables(transactionsRes.transactions);
      }

      setCashFlowData(cashFlowRes);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingSummary(false);
    }
  };

  const onCreateTransaction = async (data: CreateTransactionFormData) => {
    try {
      setCreating(true);
      await financialService.createTransaction(data);

      toast({
        title: 'Lançamento criado',
        description: 'Transação financeira criada com sucesso',
      });

      setIsNewTransactionOpen(false);
      reset();
      loadData();
    } catch (error) {
      toast({
        title: 'Erro ao criar lançamento',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await financialService.markAsPaid(id);

      toast({
        title: 'Marcado como pago',
        description: 'Transação atualizada com sucesso',
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const transactions = activeTab === 'receivables' ? receivables : payables;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Gerencie contas a receber, pagar e fluxo de caixa</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalReceivable)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.pendingReceivable)} pendente
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalPayable)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.pendingPayable)} pendente
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalReceivable - summary.totalPayable)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
                  <DialogDescription>
                    Registre uma nova transação financeira
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onCreateTransaction)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RECEIVABLE">Conta a Receber</SelectItem>
                            <SelectItem value="PAYABLE">Conta a Pagar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.type && <p className="text-sm text-red-600">{errors.type.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input {...register('description')} placeholder="Descrição da transação" />
                    {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register('value', { valueAsNumber: true })}
                        placeholder="0,00"
                      />
                      {errors.value && <p className="text-sm text-red-600">{errors.value.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Vencimento *</Label>
                      <Input type="date" {...register('dueDate')} />
                      {errors.dueDate && <p className="text-sm text-red-600">{errors.dueDate.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input {...register('category')} placeholder="Ex: Vendas, Fornecedores" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsNewTransactionOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Criar Lançamento
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
          <CardDescription>Evolução de receitas e despesas</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Receitas" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Despesas" strokeWidth={2} />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="Saldo" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabelas de Transações */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transações Financeiras</CardTitle>
              <CardDescription>Gerencie contas a receber e pagar</CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
              <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.category && (
                              <p className="text-xs text-muted-foreground">{transaction.category}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(transaction.dueDate)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(transaction.value)}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-right">
                          {transaction.status === 'PENDING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsPaid(transaction.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Marcar como Pago
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
