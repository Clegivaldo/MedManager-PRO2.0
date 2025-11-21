import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building,
  Users,
  HardDrive,
  Layers,
  ArrowLeft,
  Activity,
  User,
  Package,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import superadminService, { type SuperadminTenant } from "@/services/superadmin.service";
import { useToast } from "@/hooks/use-toast";

export default function TenantDetails() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<SuperadminTenant | null>(null);
  const [activities, setActivities] = useState<Array<{ user?: string; action: string; time: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return;
      try {
        setLoading(true);
        const t = await superadminService.getTenant(tenantId);
        setTenant(t);
        const logs = await superadminService.getAuditLogs({ tenantId, limit: 5, page: 1 });
        const mapped = logs.logs.map((l: any) => ({
          user: l.user?.name || l.userId || 'Sistema',
          action: l.action || l.details || 'Ação registrada',
          time: new Date(l.createdAt).toLocaleString('pt-BR')
        }));
        setActivities(mapped);
      } catch (err) {
        console.error(err);
        toast({ title: 'Erro ao carregar detalhes do tenant', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "inactive": return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      case "trial": return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Link to="/superadmin/tenants">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Building className="h-8 w-8 text-muted-foreground" />
                    {tenant?.name || (loading ? 'Carregando...' : 'Tenant')}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    {tenant?.cnpj && <p className="text-muted-foreground font-mono">{tenant.cnpj}</p>}
                    {tenant?.status && getStatusBadge(tenant.status)}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Plano Contratado</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{tenant?.plan || '-'}</div>
                  <p className="text-xs text-muted-foreground">{loading ? 'Carregando...' : 'Sem informação de fatura'}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Informação não disponível</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Uso de Armazenamento</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <Progress value={0} className="h-2 mt-2" />
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>Últimas ações realizadas pelos usuários do tenant.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                      {activities.map((activity, index) => (
                        <TableRow key={index}>
                                <TableCell className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                              <Activity className="h-4 w-4 text-muted-foreground"/>
                                    </div>
                                    <div>
                              <p className="font-medium">{activity.user}</p>
                              <p className="text-sm text-muted-foreground">{activity.action}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">{activity.time}</TableCell>
                            </TableRow>
                        ))}
                      {activities.length === 0 && !loading && (
                        <TableRow>
                        <TableCell colSpan={2} className="text-sm text-muted-foreground">Sem atividades</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Uso da API (Últimos 7 dias)</CardTitle>
                <CardDescription>Número de requisições por dia.</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="text-sm text-muted-foreground">Informação não disponível</div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
