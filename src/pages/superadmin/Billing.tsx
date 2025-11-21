import { useEffect, useState } from 'react';
import { billingService, type BillingAccountRecord, type BillingListResponse } from '@/services/billing.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, CheckCircle2, Send, Loader2 } from 'lucide-react';

export default function BillingPage() {
  const [data, setData] = useState<BillingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const d = await billingService.list();
      setData(d);
    } catch (err) {
      toast({ title: 'Erro ao listar billing', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doAction = async (id: string, fn: () => Promise<any>, success: string) => {
    setActionId(id);
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

  const badgeForStatus = (s: string) => {
    const map: Record<string, string> = { pending: 'bg-yellow-500', paid: 'bg-green-600', overdue: 'bg-red-600', cancelled: 'bg-gray-500' };
    return <Badge className={`${map[s] || 'bg-gray-400'} text-white`}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4 items-center">
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
            {data && (
              <div className="flex gap-4 text-xs">
                <span>Total a Receber: R$ {data.kpis.totalAReceber.toFixed(2)}</span>
                <span>Recebido no Mês: R$ {data.kpis.recebidoNoMes.toFixed(2)}</span>
                <span>Inadimplência: R$ {data.kpis.inadimplencia.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Tenant</th>
                  <th className="py-2">Descrição</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Vencimento</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(b => (
                  <tr key={b.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{b.tenant?.name}</td>
                    <td className="py-2">{b.description}</td>
                    <td className="py-2">R$ {b.amount.toFixed(2)}</td>
                    <td className="py-2">{new Date(b.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2">{badgeForStatus(b.status)}</td>
                    <td className="py-2 space-x-2">
                      {b.status === 'pending' && (
                        <Button size="sm" variant="secondary" disabled={!!actionId} onClick={() => doAction(b.id, () => billingService.markPaid(b.id), 'Marcado como pago')}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {b.status === 'pending' && (
                        <Button size="sm" variant="outline" disabled={!!actionId} onClick={() => doAction(b.id, () => billingService.resendCharge(b.id), 'Cobrança reenviada')}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data || data.items.length === 0) && !loading && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma cobrança encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
