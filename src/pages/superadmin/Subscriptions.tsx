import { useEffect, useState } from 'react';
import { subscriptionsService, type SubscriptionRecord } from '@/services/subscriptions.service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, Pause, Play, ArrowUpRight, Loader2, DollarSign, Users, XCircle, AlertTriangle } from 'lucide-react';

interface SubscriptionStats {
  total: number;
  active: number;
  expired: number;
  suspended: number;
  trial: number;
  mrr: string;
  byPlan: Record<string, number>;
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionRecord[]>([]);
  const [filteredItems, setFilteredItems] = useState<SubscriptionRecord[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const load = async () => {
    try {
      setLoading(true);
      const [subscriptions, statsData] = await Promise.all([
        subscriptionsService.list(),
        subscriptionsService.getStats()
      ]);
      setItems(subscriptions);
      setFilteredItems(subscriptions);
      setStats(statsData);
    } catch (err) {
      toast({ title: 'Erro ao listar assinaturas', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...items];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Filtro de plano
    if (planFilter !== 'all') {
      filtered = filtered.filter(sub => sub.plan?.name === planFilter);
    }

    setFilteredItems(filtered);
  }, [searchTerm, statusFilter, planFilter, items]);

  const doAction = async (tenantId: string, fn: () => Promise<any>, success: string) => {
    setActionId(tenantId);
    try {
      await fn();
      toast({ title: success });
      await load();
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-500',
      expired: 'bg-red-500',
      suspended: 'bg-yellow-500',
      trial: 'bg-blue-500'
    };
    return <Badge className={`${map[status] || 'bg-gray-500'} text-white`}>{status}</Badge>;
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  // Cards de KPIs
  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total de Assinaturas"
            value={stats.total}
            icon={Users}
            color="text-blue-600"
          />
          <StatCard
            title="Assinaturas Ativas"
            value={stats.active}
            icon={Play}
            color="text-green-600"
          />
          <StatCard
            title="Vencidas"
            value={stats.expired}
            icon={XCircle}
            color="text-red-600"
          />
          <StatCard
            title="MRR"
            value={formatCurrency(stats.mrr)}
            icon={DollarSign}
            color="text-emerald-600"
          />
        </div>
      )}

      {/* Tabela de Assinaturas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão de Assinaturas</CardTitle>
              <CardDescription className="mt-1">
                {filteredItems.length} de {items.length} assinaturas
              </CardDescription>
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              placeholder="Buscar por tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="suspended">Suspensas</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {stats && Object.keys(stats.byPlan).map(planName => (
                  <SelectItem key={planName} value={planName}>{planName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Tenant</th>
                  <th className="py-2">Plano</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Início</th>
                  <th className="py-2">Fim</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(sub => (
                  <tr key={sub.tenantId} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{sub.tenant?.name}</td>
                    <td className="py-2">{sub.plan?.name || sub.planId}</td>
                    <td className="py-2">{statusBadge(sub.status)}</td>
                    <td className="py-2">{new Date(sub.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2">{new Date(sub.endDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!actionId}
                        onClick={() => doAction(sub.tenantId, () => subscriptionsService.renew(sub.tenantId, 1), 'Renovado')}
                        title="Renovar por 1 mês"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      {sub.status !== 'suspended' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!actionId}
                          onClick={() => doAction(sub.tenantId, () => subscriptionsService.suspend(sub.tenantId, 'Suspenso via painel'), 'Suspenso')}
                          title="Suspender"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!actionId}
                          onClick={() => doAction(sub.tenantId, () => subscriptionsService.renew(sub.tenantId, 0), 'Reativado')}
                          title="Reativar"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && !loading && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">
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
