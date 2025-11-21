import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, CheckCircle, Layers, FileText, PackageCheck } from 'lucide-react';
import superadminService from '@/services/superadmin.service';

export default function SystemHealth() {
  const [overview, setOverview] = useState<{ totalTenants: number; activeTenants: number; recentTenants: any[] } | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ov, mt] = await Promise.all([
          superadminService.getSystemOverview(),
          superadminService.getSystemMetrics(),
        ]);
        setOverview(ov);
        setMetrics(mt);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saúde do Sistema</h1>
        <p className="text-gray-600 mt-1">Visão geral real do ambiente e operações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>Tenants Totais</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Layers className="h-10 w-10 text-blue-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">{overview?.totalTenants ?? (loading ? '...' : 0)}</p>
                <Progress value={100} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tenants Ativos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Users className="h-10 w-10 text-green-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">{overview?.activeTenants ?? (loading ? '...' : 0)}</p>
                <Progress value={overview && overview.totalTenants ? (overview.activeTenants / overview.totalTenants) * 100 : 0} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Notificações Não Lidas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-10 w-10 text-purple-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">{metrics?.notifications?.unread ?? (loading ? '...' : 0)}</p>
                <Progress value={0} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Indicadores Operacionais</CardTitle>
            <CardDescription>Dados reais do último período.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Notas Fiscais (30 dias)</div>
                <div className="text-right">
                  <span className="mr-4">Autorizadas: <strong>{metrics?.invoices?.authorizedLast30Days ?? '-'}</strong></span>
                  <span>Canceladas: <strong>{metrics?.invoices?.cancelledLast30Days ?? '-'}</strong></span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-muted-foreground" /> Estoque</div>
                <div className="text-right">
                  <span className="mr-4">Vencendo: <strong>{metrics?.inventory?.expiringSoonCount ?? '-'}</strong></span>
                  <span>Vencidos: <strong>{metrics?.inventory?.expiredCount ?? '-'}</strong></span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /> Tenants</div>
                <div className="text-right">
                  <span className="mr-4">Totais: <strong>{overview?.totalTenants ?? '-'}</strong></span>
                  <span>Ativos: <strong>{overview?.activeTenants ?? '-'}</strong></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenants Recentes</CardTitle>
            <CardDescription>Últimos cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(overview?.recentTenants || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Layers className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.cnpj} • Plano: {t.plan}</div>
                  </div>
                </div>
                {t.status === 'active' ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Ativo</Badge>
                ) : (
                  <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1"/> {t.status}</Badge>
                )}
              </div>
            ))}
            {(!overview || (overview.recentTenants?.length ?? 0) === 0) && !loading && (
              <div className="text-sm text-muted-foreground">Nenhum tenant recente</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
