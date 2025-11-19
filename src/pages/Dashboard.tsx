import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  Shield,
  FileText,
  Activity,
  DollarSign,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dashboardService, { type DashboardMetrics } from '@/services/dashboard.service';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getMetrics();
      setMetrics(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar métricas',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg text-gray-500">Carregando dashboard...</div>
    </div>;
  }

  if (!metrics) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg text-gray-500">Erro ao carregar dados</div>
    </div>;
  }

  const alertIcons = {
    EXPIRED_BATCHES: AlertTriangle,
    EXPIRING_SOON: AlertTriangle,
    LOW_STOCK: Package,
    CONTROLLED_NO_MOVEMENT: Shield,
    default: FileText
  };

  const severityColor = {
    low: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    medium: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
    high: 'border-red-200 bg-red-50 hover:bg-red-100'
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar métricas do dashboard</p>
        <Button onClick={loadMetrics} className="mt-4">
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
          <Button size="sm" onClick={loadMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.sales.today)}
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
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.sales.month)}
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.invoices.issued}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.invoices.cancelled} canceladas</p>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.compliance.score}%</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.compliance.alerts.length} alertas</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <Shield className={`h-6 w-6 ${metrics.compliance.score >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
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
              {metrics.compliance.alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p className="text-sm">Nenhum alerta no momento</p>
                </div>
              ) : (
                metrics.compliance.alerts.map((alert, index) => {
                  const AlertIcon = alertIcons[alert.type] || alertIcons.default;
                  return (
                    <div key={index} className={`p-4 rounded-lg border transition-colors ${severityColor[alert.severity]}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <AlertIcon className="h-5 w-5 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
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
                {metrics.inventory.lowStock.length === 0 && metrics.inventory.expiringBatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm">Estoque normalizado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {metrics.inventory.lowStock.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />
                          Estoque Baixo ({metrics.inventory.lowStock.length})
                        </h4>
                        <div className="space-y-2">
                          {metrics.inventory.lowStock.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-gray-600">Estoque atual: {item.currentStock} un.</p>
                              </div>
                              <Badge variant="outline" className="bg-yellow-100">
                                Mín: {item.minStock}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {metrics.inventory.expiringBatches.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1 text-orange-600" />
                          Lotes Vencendo ({metrics.inventory.expiringBatches.length})
                        </h4>
                        <div className="space-y-2">
                          {metrics.inventory.expiringBatches.slice(0, 5).map((batch, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div>
                                <p className="text-sm font-medium">{batch.productName}</p>
                                <p className="text-xs text-gray-600">
                                  Lote: {batch.batch} | Qtd: {batch.quantity} un.
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-orange-100">
                                {new Date(batch.expiryDate).toLocaleDateString('pt-BR')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {metrics.inventory.expiredCount > 0 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center">
                          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-red-900">
                              {metrics.inventory.expiredCount} lote(s) vencido(s)
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
                    <p className="text-2xl font-bold text-gray-900">{metrics.overview.activeCustomers}</p>
                    <p className="text-xs text-gray-600 mt-1">Clientes Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-gray-900">{metrics.overview.activeProducts}</p>
                    <p className="text-xs text-gray-600 mt-1">Produtos Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-gray-900">{metrics.overview.controlledProducts}</p>
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
