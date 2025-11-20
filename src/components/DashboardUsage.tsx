import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HardDrive, Users, Package, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';
import dashboardService, { type UsageMetrics } from '@/services/dashboard.service';
import { Link } from 'react-router-dom';

export default function DashboardUsage() {
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getUsage();
      setUsage(response);
    } catch (error) {
      toast({
        title: 'Erro ao carregar uso do plano',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' };
    if (percentage >= 50) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500' };
  };

  const ProgressBar = ({ percentage, label, current, limit, allowed }: { percentage: number; label: string; current: number; limit: number | null; allowed: boolean }) => {
    const colors = getStatusColor(percentage);
    const isLimited = limit && limit !== -1;
    const showWarning = !allowed && percentage >= 80;

    return (
      <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`font-medium ${colors.text}`}>{label}</span>
          <span className={`text-sm font-semibold ${colors.text}`}>
            {current}{isLimited ? `/${limit}` : ' (ilimitado)'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-600">{percentage}% utilizado</span>
          {showWarning && (
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Limite próximo
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro ao Carregar Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadUsage} className="w-full">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubscriptionExpired = usage.subscription.status === 'expired';
  const isNearExpiration = usage.subscription.daysRemaining <= 7 && usage.subscription.daysRemaining > 0;

  return (
    <div className="space-y-6">
      {/* Header com Status da Assinatura */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Plano: {usage.planName}
              </CardTitle>
              <CardDescription>Acompanhe o uso dos recursos do seu plano</CardDescription>
            </div>
            <div className="text-right">
              {isSubscriptionExpired && (
                <Badge variant="destructive" className="text-sm py-1">
                  ⚠️ Assinatura Expirada
                </Badge>
              )}
              {isNearExpiration && (
                <Badge className="bg-orange-500 text-white text-sm py-1">
                  ⏰ Expira em {usage.subscription.daysRemaining} dia(s)
                </Badge>
              )}
              {!isSubscriptionExpired && !isNearExpiration && (
                <Badge className="bg-green-500 text-white text-sm py-1">
                  ✓ Ativo
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grids de Uso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Usuários */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar
              percentage={usage.users.percentage}
              label="Usuários criados"
              current={usage.users.current}
              limit={usage.users.limit}
              allowed={usage.users.allowed}
            />
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar
              percentage={usage.products.percentage}
              label="Produtos cadastrados"
              current={usage.products.current}
              limit={usage.products.limit}
              allowed={usage.products.allowed}
            />
          </CardContent>
        </Card>

        {/* Transações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transações
            </CardTitle>
            <CardDescription className="text-xs">{usage.transactions.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar
              percentage={usage.transactions.percentage}
              label="Transações realizadas"
              current={usage.transactions.current}
              limit={usage.transactions.limit}
              allowed={usage.transactions.allowed}
            />
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar
              percentage={usage.storage.percentage}
              label={`Espaço utilizado (${usage.storage.unit})`}
              current={usage.storage.current}
              limit={usage.storage.limit}
              allowed={usage.storage.allowed}
            />
          </CardContent>
        </Card>
      </div>

      {/* Info Box com Dicas */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dicas para Otimizar
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-700">
          <p>• Se atingir 80% de utilização, um alerta será exibido</p>
          <p>• Ao atingir 100%, novas criações serão bloqueadas</p>
          <p>• Atualize para um plano superior para aumentar os limites</p>
          <div className="mt-3">
            <Link to="/subscription" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Visualizar Planos Disponíveis
            </Link>
          </div>
        </CardContent>
      </Card>

      {isSubscriptionExpired && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Assinatura Expirada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-600 space-y-2">
            <p>Sua assinatura expirou. Renove agora para continuar usando o sistema.</p>
            <Link to="/subscription" className="text-red-700 hover:text-red-800 font-semibold inline-block mt-2">
              → Renovar Assinatura
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
