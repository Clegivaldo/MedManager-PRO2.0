import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  Search,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface BillingAccount {
  id: string;
  tenantId: string;
  tenantName: string;
  description: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: string;
  paidAmount?: string;
  createdAt: string;
  updatedAt: string;
}

interface BillingStats {
  totalPending: string;
  totalPaid: string;
  totalOverdue: string;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  averageDaysToPayment: number;
  paymentByMonth: Array<{ month: string; amount: string; count: number }>;
  paymentByTenant: Array<{ tenantId: string; tenantName: string; pending: string; paid: string; count: number }>;
}

interface PaginatedBillingAccounts {
  accounts: BillingAccount[];
  stats: BillingStats;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function BillingAccounts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (selectedTenant) params.append('tenantId', selectedTenant);

      const res = await api.get<PaginatedBillingAccounts>(`/superadmin/billing-accounts?${params.toString()}`);
      setAccounts(res.data.accounts);
      setStats(res.data.stats);
      setTotal(res.data.pagination.total);
      setPages(res.data.pagination.pages);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao carregar contas',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit, searchTerm, statusFilter, dateRange, selectedTenant]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paga</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    if (accounts.length === 0) {
      toast({ title: 'Nenhum dado', description: 'Não há contas para exportar', variant: 'destructive' });
      return;
    }

    const headers = ['Tenant', 'Descrição', 'Valor', 'Data Vencimento', 'Status', 'Data Pagamento', 'Valor Pago'];
    const rows = accounts.map(a => [
      a.tenantName,
      a.description,
      a.amount,
      formatDate(a.dueDate),
      a.status,
      a.paidAt ? formatDate(a.paidAt) : '-',
      a.paidAmount || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();

    toast({ title: 'Exportado', description: 'Arquivo CSV criado e baixado' });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Faturamento
          </h1>
          <p className="text-muted-foreground">Acompanhe contas a receber dos tenants por período, tenant e status</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingCount} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paga</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
                <p className="text-xs text-muted-foreground">{stats.paidCount} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencida</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalOverdue)}</div>
                <p className="text-xs text-muted-foreground">{stats.overdueCount} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dias Médios</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats.averageDaysToPayment)}</div>
                <p className="text-xs text-muted-foreground">para pagamento</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Buscar</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tenant ou descrição"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={load}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Período</label>
                <Select value={dateRange} onValueChange={(v: any) => { setDateRange(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="quarter">Este trimestre</SelectItem>
                    <SelectItem value="year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Itens/página</label>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={exportToCSV} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contas a Receber</CardTitle>
            <CardDescription>
              Total de {total} contas • Página {page} de {pages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando contas...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead>Valor Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.tenantName}</TableCell>
                        <TableCell className="text-sm">{account.description}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(account.amount)}</TableCell>
                        <TableCell>{formatDate(account.dueDate)}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell>
                          {account.paidAt ? formatDate(account.paidAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {account.paidAmount ? (
                            <span className="text-green-700 font-semibold">{formatCurrency(account.paidAmount)}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && accounts.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment by Month */}
        {stats && stats.paymentByMonth && stats.paymentByMonth.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Faturamento por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Quantidade de Contas</TableHead>
                      <TableHead>Valor Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.paymentByMonth.map((item) => (
                      <TableRow key={item.month}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>{formatCurrency((parseFloat(item.amount) / item.count).toString())}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment by Tenant */}
        {stats && stats.paymentByTenant && stats.paymentByTenant.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Faturamento por Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Pendente</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Contas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.paymentByTenant.map((item) => (
                      <TableRow key={item.tenantId}>
                        <TableCell className="font-medium">{item.tenantName}</TableCell>
                        <TableCell className="text-yellow-700 font-semibold">{formatCurrency(item.pending)}</TableCell>
                        <TableCell className="text-green-700 font-semibold">{formatCurrency(item.paid)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency((parseFloat(item.pending) + parseFloat(item.paid)).toString())}
                        </TableCell>
                        <TableCell>{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
