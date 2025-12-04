import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Shield,
  FileText,
  Activity,
  DollarSign,
  Users,
  RefreshCw
} from 'lucide-react';
import dashboardService from '@/services/dashboard.service';
import authService from '@/services/auth.service';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/socket.service';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = authService.getAccessToken();
    if (token && user?.tenantId) {
      socketService.connect(token, user.tenantId);

      const cleanup = socketService.on('dashboard:update', (data: any) => {
        console.log('Real-time update received:', data);
        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });

        toast({
          title: 'Dados atualizados',
          description: 'O dashboard foi atualizado com novas informações.',
          duration: 3000
        });
      });

      return () => {
        cleanup();
        socketService.disconnect();
      };
    }
  }, [user]);

  const { data: metrics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardService.getMetrics,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show an error toast only when `isError` changes to true to avoid
  // triggering side effects during render (which can cause re-render loops).
  useEffect(() => {
    if (isError) {
      toast({
        title: 'Erro ao carregar métricas',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    }
  }, [isError]);

  const alertIcons: Record<string, any> = {
    EXPIRED_BATCHES: AlertTriangle,
    EXPIRING_SOON: AlertTriangle,
    LOW_STOCK: Package,
    CONTROLLED_NO_MOVEMENT: Shield,
    default: FileText
  };

  const severityColor: Record<string, string> = {
    low: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    medium: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
    high: 'border-red-200 bg-red-50 hover:bg-red-100'
  };

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar métricas do dashboard</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Visão geral do sistema de gestão farmacêutica</p>
          </div>
          <Button size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.sales.today.total || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vendas Mês</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.sales.month.total || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">NF-e Emitidas</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.invoices.issued}</p>
                    <p className="text-xs text-gray-500 mt-1">{metrics?.invoices.cancelled} canceladas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conformidade</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.compliance.score}%</p>
                    <p className="text-xs text-gray-500 mt-1">{metrics?.compliance.alerts.length} alertas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <Shield className={`h-6 w-6 ${metrics && metrics.compliance.score >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-indigo-900">
                <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                Análise Preditiva e Inteligência
              </CardTitle>
              <CardDescription className="text-indigo-700">
                Insights baseados no histórico de vendas e movimentações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PredictiveAnalytics />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Alertas e Conformidade
              </CardTitle>
              <CardDescription>
                Status atual do sistema e ANVISA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
              ) : metrics?.compliance.alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p className="text-sm">Nenhum alerta no momento</p>
                </div>
              ) : (
                metrics?.compliance.alerts.map((alert, index) => {
                  const AlertIcon = alertIcons[alert.type] || alertIcons.default;
                  return (
                    <div key={index} className={`p-4 rounded-lg border transition-colors ${severityColor[alert.severity]}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <AlertIcon className="h-5 w-5 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm">{alert.message}</h4>
                            <p className="text-xs text-gray-600 mt-1"></p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {alert.count}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-orange-600" />
                  Alertas de Estoque
                </CardTitle>
                <CardDescription>
                  Produtos com estoque baixo ou lotes vencendo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : metrics && metrics.inventory.lowStock.length === 0 && metrics.inventory.expiringBatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm">Estoque normalizado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {metrics?.inventory.lowStock.length! > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />
                          Estoque Baixo ({metrics?.inventory.lowStock.length})
                        </h4>
                        <div className="space-y-2">
                          {metrics?.inventory.lowStock.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div>
                                <p className="text-sm font-medium">{item.productName}</p>
                                <p className="text-xs text-gray-600">Estoque atual: {item.availableQuantity} un.</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {metrics?.inventory.expiringBatches.length! > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1 text-orange-600" />
                          Lotes Vencendo ({metrics?.inventory.expiringBatches.length})
                        </h4>
                        <div className="space-y-2">
                          {metrics?.inventory.expiringBatches.slice(0, 5).map((batch, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div>
                                <p className="text-sm font-medium">{batch.productName}</p>
                                <p className="text-xs text-gray-600">
                                  Lote: {batch.batchNumber} | Qtd: {batch.quantity} un.
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-orange-100">
                                {new Date(batch.expirationDate).toLocaleDateString('pt-BR')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {metrics?.inventory.expiredCount! > 0 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center">
                          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-red-900">
                              {metrics?.inventory.expiredCount} lote(s) vencido(s)
                            </p>
                            <p className="text-xs text-red-700 mt-1">
                              Ação imediata necessária - segregar produtos
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    Resumo Geral
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : metrics?.overview.activeCustomers}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Clientes Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : metrics?.overview.activeProducts}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Produtos Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : metrics?.overview.controlledProducts}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Controlados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function PredictiveAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['predictive-metrics'],
    queryFn: dashboardService.getPredictiveMetrics,
    staleTime: 60 * 60 * 1000 // 1 hour
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-indigo-900 mb-3 flex items-center">
          <TrendingUp className="h-4 w-4 mr-1" />
          Previsão de Vendas (Próximo Mês)
        </h4>
        <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.salesForecast.nextMonth)}
              </p>
              <div className="flex items-center mt-1">
                <span className={`text-xs font-medium ${data.salesForecast.trend === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  {data.salesForecast.trend === 'up' ? '+' : ''}{data.salesForecast.percentage.toFixed(1)}%
                  {data.salesForecast.trend === 'up' ? ' 📈' : ' 📉'}
                </span>
                <span className="text-xs text-gray-500 ml-1">vs. média mensal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-indigo-900 mb-3 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Risco de Ruptura de Estoque (30 dias)
        </h4>
        <div className="space-y-2">
          {data.stockDepletion.length === 0 ? (
            <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm text-center">
              <p className="text-sm text-green-700">Nenhum risco de ruptura identificado.</p>
            </div>
          ) : (
            data.stockDepletion.map((item: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-500">Estoque: {item.currentStock} | Consumo diário: {item.avgDailyConsumption.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {item.daysRemaining} dias
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
