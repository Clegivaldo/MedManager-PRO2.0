import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionInfo {
  subscription: {
    id: string;
    endDate: string;
    status: string;
    billingCycle: string;
  };
  plan: {
    name: string;
    displayName: string;
    priceMonthly: number;
    priceAnnual: number;
  };
  daysUntilExpiration: number;
  isExpired: boolean;
}

export default function LicenseExpired() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPayment, setGeneratingPayment] = useState(false);

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      const response = await api.get('/subscriptions/info');
      setSubscriptionInfo(response.data);
    } catch (error) {
      console.error('Erro ao carregar informações da assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    setGeneratingPayment(true);
    try {
      // Criar cobrança para renovação
      const response = await api.post('/payments/create-charge', {
        amount: subscriptionInfo?.plan.priceMonthly,
        description: `Renovação mensal - Plano ${subscriptionInfo?.plan.displayName}`,
        billingCycle: 'monthly',
      });

      // Redirecionar para página de pagamento
      navigate('/payment', { state: { charge: response.data } });
    } catch (error) {
      console.error('Erro ao gerar cobrança:', error);
      alert('Erro ao gerar cobrança. Entre em contato com o suporte.');
    } finally {
      setGeneratingPayment(false);
    }
  };

  const handleContactSupport = () => {
    window.open('mailto:suporte@medmanager.com.br', '_blank');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const expiredDate = subscriptionInfo?.subscription.endDate 
    ? new Date(subscriptionInfo.subscription.endDate).toLocaleDateString('pt-BR') 
    : 'N/A';

  const renewalAmount = subscriptionInfo?.plan.priceMonthly 
    ? subscriptionInfo.plan.priceMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Licença Expirada
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sua assinatura do MedManager PRO expirou
          </p>
        </div>

        {/* Alert */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Bloqueado</AlertTitle>
          <AlertDescription>
            Seu acesso ao sistema foi bloqueado devido à assinatura vencida.
            Renove sua assinatura para continuar utilizando todas as funcionalidades.
          </AlertDescription>
        </Alert>

        {/* Subscription Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Assinatura</CardTitle>
            <CardDescription>
              Informações sobre sua assinatura atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <p className="font-semibold">{subscriptionInfo?.plan.displayName || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{expiredDate}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor da Renovação</p>
                  <p className="font-semibold">{renewalAmount}/mês</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">Expirada</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Usuário:</strong> {user?.name} ({user?.email})
              </p>
              <p className="text-sm text-muted-foreground">
                Para renovar sua assinatura, clique no botão abaixo para gerar uma cobrança via PIX ou boleto.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRenewSubscription}
            disabled={generatingPayment}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {generatingPayment ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Gerando cobrança...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Renovar Assinatura Agora
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full"
            >
              Falar com Suporte
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full"
            >
              Sair do Sistema
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Precisa de ajuda?</p>
                <p>
                  Nossa equipe está disponível para auxiliá-lo na renovação da assinatura.
                  Entre em contato pelo e-mail{' '}
                  <a 
                    href="mailto:suporte@medmanager.com.br" 
                    className="underline font-medium"
                  >
                    suporte@medmanager.com.br
                  </a>
                  {' '}ou telefone (11) 9999-9999.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
