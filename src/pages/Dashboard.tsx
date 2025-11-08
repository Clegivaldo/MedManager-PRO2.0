import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Shield,
  FileText,
  Activity,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const metrics = [
    {
      title: 'Produtos Ativos',
      value: '2.847',
      change: '+12%',
      trend: 'up',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Pedidos Hoje',
      value: '156',
      change: '+8%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-green-600'
    },
    {
      title: 'Estoque Total',
      value: 'R$ 2.4M',
      change: '-2%',
      trend: 'down',
      icon: Warehouse,
      color: 'text-orange-600'
    },
    {
      title: 'Faturamento',
      value: 'R$ 847K',
      change: '+15%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  const alerts = [
    {
      type: 'warning',
      title: 'Estoque Baixo',
      description: '23 produtos abaixo do estoque mínimo',
      icon: AlertTriangle,
      count: 23,
      link: '/inventory'
    },
    {
      type: 'error',
      title: 'Vencimento Próximo',
      description: '8 lotes vencem em 30 dias',
      icon: AlertTriangle,
      count: 8,
      link: '/products'
    },
    {
      type: 'info',
      title: 'Guia 33 Pendente',
      description: '5 transportes aguardam aprovação',
      icon: FileText,
      count: 5,
      link: '/compliance'
    },
    {
      type: 'success',
      title: 'Temperatura OK',
      description: 'Todos os sensores dentro da faixa',
      icon: Thermometer,
      count: 0,
      link: '/compliance'
    }
  ];

  const recentOrders = [
    {
      id: '#PED-2024-001',
      client: 'Drogaria São Paulo',
      value: 'R$ 12.450,00',
      status: 'Processando',
      items: 15
    },
    {
      id: '#PED-2024-002',
      client: 'Farmácia Popular',
      value: 'R$ 8.750,00',
      status: 'Enviado',
      items: 8
    },
    {
      id: '#PED-2024-003',
      client: 'Rede Bem Estar',
      value: 'R$ 25.300,00',
      status: 'Entregue',
      items: 32
    }
  ];

  const topProducts = [
      { name: 'Paracetamol 500mg', sales: 1250 },
      { name: 'Dipirona 500mg', sales: 980 },
      { name: 'Amoxicilina 875mg', sales: 750 },
      { name: 'Losartana 50mg', sales: 620 },
      { name: 'Vitamina C', sales: 510 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processando': return 'bg-yellow-100 text-yellow-800';
      case 'Enviado': return 'bg-blue-100 text-blue-800';
      case 'Entregue': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'error': return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'info': return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'success': return 'border-green-200 bg-green-50 hover:bg-green-100';
      default: return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema de gestão farmacêutica</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs. mês anterior</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-gray-50`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
              {alerts.map((alert, index) => (
                <Link to={alert.link} key={index} className={`block p-4 rounded-lg border transition-colors ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <alert.icon className="h-5 w-5 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                      </div>
                    </div>
                    {alert.count > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {alert.count}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    Pedidos Recentes
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/orders">Ver Todos</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <ShoppingCart className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{order.id}</h4>
                          <p className="text-xs text-gray-600">{order.client}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{order.value}</p>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Star className="h-5 w-5 mr-2 text-yellow-500" />
                        Top 5 Produtos Vendidos (Mês)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {topProducts.map((product, index) => (
                            <li key={index} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-muted-foreground">{product.sales.toLocaleString()} unidades</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
