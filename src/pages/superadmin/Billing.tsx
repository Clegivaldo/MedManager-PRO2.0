import { useEffect, useState } from 'react';
import { billingService, type BillingStats, type BillingItem } from '@/services/billing.service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, Loader2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BillingPage() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const [statsData, billingData] = await Promise.all([
        billingService.getStats(),
        billingService.listBilling({ status: statusFilter === 'all' ? undefined : statusFilter })
      ]);
      setStats(statsData);
      setItems(billingData.items);
    } catch (err) {
      toast({ title: 'Erro ao carregar dados', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-500',
      expired: 'bg-red-500',
      suspended: 'bg-yellow-500',
      trial: 'bg-blue-500',
      cancelled: 'bg-gray-500'
    };
    return <Badge className={`${map[status] || 'bg-gray-500'} text-white capitalize`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total a Receber"
            value={formatCurrency(stats.totalToReceive)}
            icon={DollarSign}
            color="text-blue-600"
            trend="Mês atual"
          />
          <StatCard
            title="MRR"
            value={formatCurrency(stats.mrr)}
            icon={TrendingUp}
            color="text-green-600"
            trend="Receita mensal recorrente"
          />
          <StatCard
            title="ARR"
            value={formatCurrency(stats.arr)}
            icon={TrendingUp}
            color="text-emerald-600"
            trend="Receita anual recorrente"
          />
          <StatCard
            title="Taxa de Churn"
            value={`${stats.churnRate}%`}
            icon={TrendingDown}
            color="text-red-600"
            trend={`${stats.activeSubscriptionsCount}/${stats.totalSubscriptionsCount} ativas`}
          />
        </div>
      )}

      {/* Gráfico de Receita */}
      {stats && stats.monthlyRevenue && (
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal (Últimos 12 Meses)</CardTitle>
            <CardDescription>Evolução da receita recorrente mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Cobranças (Subscriptions) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assinaturas / Cobranças</CardTitle>
              <CardDescription className="mt-1">
                {items.length} {items.length === 1 ? 'assinatura' : 'assinaturas'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="suspended">Suspensas</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Tenant</th>
                  <th className="py-2">Plano</th>
                  <th className="py-2">Valor Mensal</th>
                  <th className="py-2">Período</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{item.tenantName}</td>
                    <td className="py-2">{item.planName}</td>
                    <td className="py-2 font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="py-2 text-xs text-muted-foreground">{item.period}</td>
                    <td className="py-2">{statusBadge(item.status)}</td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhuma assinatura encontrada
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
