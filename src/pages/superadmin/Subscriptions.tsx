import { useEffect, useState } from 'react';
import { subscriptionsService, type SubscriptionRecord } from '@/services/subscriptions.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, Pause, Play, ArrowUpRight, Loader2 } from 'lucide-react';

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const data = await subscriptionsService.list();
      setItems(data);
    } catch (err) {
      toast({ title: 'Erro ao listar assinaturas', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
    const map: Record<string, string> = { active: 'bg-green-500', expired: 'bg-red-500', suspended: 'bg-yellow-500', trial: 'bg-blue-500' };
    return <Badge className={`${map[status] || 'bg-gray-500'} text-white`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
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
                {items.map(sub => (
                  <tr key={sub.tenantId} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{sub.tenant?.name}</td>
                    <td className="py-2">{sub.plan?.name || sub.planId}</td>
                    <td className="py-2">{statusBadge(sub.status)}</td>
                    <td className="py-2">{new Date(sub.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2">{new Date(sub.endDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 space-x-2">
                      <Button size="sm" variant="secondary" disabled={!!actionId} onClick={() => doAction(sub.tenantId, () => subscriptionsService.renew(sub.tenantId, 1), 'Renovado')}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      {sub.status !== 'suspended' ? (
                        <Button size="sm" variant="destructive" disabled={!!actionId} onClick={() => doAction(sub.tenantId, () => subscriptionsService.suspend(sub.tenantId, 'Suspenso via painel'), 'Suspenso')}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={!!actionId} onClick={() => doAction(sub.tenantId, () => subscriptionsService.renew(sub.tenantId, 0), 'Reativado')}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma assinatura encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
