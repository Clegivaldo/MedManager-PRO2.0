import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getGlobalPaymentConfig, updateGlobalPaymentConfig, GlobalPaymentConfigMasked } from '@/services/superadmin-payments.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertCircle, ExternalLink, Info } from 'lucide-react';

export default function PaymentProviders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<GlobalPaymentConfigMasked | null>(null);

  // form states
  const [activeGateway, setActiveGateway] = useState<'asaas' | 'infinitypay'>('asaas');
  const [asaasEnvironment, setAsaasEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasWebhookToken, setAsaasWebhookToken] = useState('');

  const [infinityPayMerchantId, setInfinityPayMerchantId] = useState('');
  const [infinityPayApiKey, setInfinityPayApiKey] = useState('');
  const [infinityPayPublicKey, setInfinityPayPublicKey] = useState('');
  const [infinityPayWebhookSecret, setInfinityPayWebhookSecret] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getGlobalPaymentConfig();
        setCfg(data);
        setActiveGateway(data.activeGateway);
        setAsaasEnvironment(data.asaasEnvironment);
        // Preencher campos com valores salvos (mascarados)
        if (data.asaasApiKeyMasked && data.asaasApiKeyMasked !== 'Não configurado') {
          setAsaasApiKey(data.asaasApiKeyMasked);
        }
        if (data.asaasWebhookTokenMasked && data.asaasWebhookTokenMasked !== 'Não configurado') {
          setAsaasWebhookToken(data.asaasWebhookTokenMasked);
        }
        if (data.infinityPayMerchantIdMasked && data.infinityPayMerchantIdMasked !== 'Não configurado') {
          setInfinityPayMerchantId(data.infinityPayMerchantIdMasked);
        }
        if (data.infinityPayApiKeyMasked && data.infinityPayApiKeyMasked !== 'Não configurado') {
          setInfinityPayApiKey(data.infinityPayApiKeyMasked);
        }
        if (data.infinityPayPublicKeyMasked && data.infinityPayPublicKeyMasked !== 'Não configurado') {
          setInfinityPayPublicKey(data.infinityPayPublicKeyMasked);
        }
        if (data.infinityPayWebhookSecretMasked && data.infinityPayWebhookSecretMasked !== 'Não configurado') {
          setInfinityPayWebhookSecret(data.infinityPayWebhookSecretMasked);
        }
      } catch (e: any) {
        toast({ title: 'Erro', description: e?.message || 'Falha ao carregar configuração', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  async function saveAsaas() {
    setSaving(true);
    try {
      const update: any = { asaasEnvironment };
      if (asaasApiKey && !asaasApiKey.includes('***')) {
        update.asaasApiKey = asaasApiKey.trim();
      }
      if (asaasWebhookToken && !asaasWebhookToken.includes('***')) {
        update.asaasWebhookToken = asaasWebhookToken.trim();
      }

      if (!update.asaasApiKey && !update.asaasWebhookToken && update.asaasEnvironment === cfg?.asaasEnvironment) {
        toast({ title: 'Aviso', description: 'Nenhuma alteração para salvar', variant: 'default' });
        setSaving(false);
        return;
      }

      const updated = await updateGlobalPaymentConfig(update);
      setCfg(updated);
      setAsaasApiKey('');
      setAsaasWebhookToken('');
      toast({ title: 'Salvo', description: 'Configurações Asaas atualizadas com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function saveActiveGateway() {
    setSaving(true);
    try {
      const updated = await updateGlobalPaymentConfig({ activeGateway });
      setCfg(updated);
      toast({
        title: 'Gateway ativo atualizado',
        description: `Agora usando: ${activeGateway === 'asaas' ? 'Asaas' : 'InfinityPay'}`
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar gateway ativo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function saveInfinity() {
    setSaving(true);
    try {
      const update: any = {};
      if (infinityPayMerchantId && !infinityPayMerchantId.includes('***')) {
        update.infinityPayMerchantId = infinityPayMerchantId.trim();
      }
      if (infinityPayApiKey && !infinityPayApiKey.includes('***')) {
        update.infinityPayApiKey = infinityPayApiKey.trim();
      }
      if (infinityPayPublicKey && !infinityPayPublicKey.includes('***')) {
        update.infinityPayPublicKey = infinityPayPublicKey.trim();
      }
      if (infinityPayWebhookSecret && !infinityPayWebhookSecret.includes('***')) {
        update.infinityPayWebhookSecret = infinityPayWebhookSecret.trim();
      }

      if (Object.keys(update).length === 0) {
        toast({ title: 'Aviso', description: 'Nenhuma alteração para salvar', variant: 'default' });
        setSaving(false);
        return;
      }

      const updated = await updateGlobalPaymentConfig(update);
      setCfg(updated);
      setInfinityPayMerchantId('');
      setInfinityPayApiKey('');
      setInfinityPayPublicKey('');
      setInfinityPayWebhookSecret('');
      toast({ title: 'Salvo', description: 'Credenciais InfinityPay atualizadas com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const isAsaasConfigured = cfg?.asaasApiKeyMasked && cfg.asaasApiKeyMasked !== 'Não configurado';
  const isInfinityConfigured = cfg?.infinityPayApiKeyMasked && cfg.infinityPayApiKeyMasked !== 'Não configurado';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Provedores de Pagamento</h1>
        <p className="text-muted-foreground mt-1">
          Configure as credenciais globais usadas para cobrar os tenants (assinaturas)
        </p>
      </div>

      {/* Gateway Ativo */}
      <Card>
        <CardHeader>
          <CardTitle>Gateway Ativo</CardTitle>
          <CardDescription>
            Selecione qual provedor será usado para processar novos pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xl font-semibold flex items-center gap-2">
                {activeGateway === 'asaas' ? 'Asaas' : 'InfinityPay'}
                {activeGateway === 'infinitypay' && <Badge variant="secondary">Beta</Badge>}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Gateway atual em uso para novas cobranças
              </div>
            </div>
            <Select value={activeGateway} onValueChange={(v: any) => setActiveGateway(v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione o gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="infinitypay">InfinityPay (Beta)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={saving || activeGateway === cfg?.activeGateway}
              onClick={saveActiveGateway}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Valores são armazenados de forma criptografada. Os campos mostrados abaixo são mascarados por segurança.
              Para atualizar, preencha com o novo valor (deixe em branco para manter o atual).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Gateway Configuration Tabs */}
      <Tabs defaultValue="asaas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asaas" className="flex items-center gap-2">
            Asaas
            {isAsaasConfigured && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="infinitypay" className="flex items-center gap-2">
            InfinityPay
            {isInfinityConfigured && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <Badge variant="secondary" className="ml-1">Beta</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Asaas Tab */}
        <TabsContent value="asaas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração Asaas</CardTitle>
                  <CardDescription>
                    Configure suas credenciais do Asaas para processar pagamentos
                  </CardDescription>
                </div>
                {isAsaasConfigured ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asaas-api-key">API Key</Label>
                  <Input
                    id="asaas-api-key"
                    type="password"
                    value={asaasApiKey}
                    onChange={(e) => setAsaasApiKey(e.target.value)}
                    placeholder={cfg?.asaasApiKeyMasked ?? 'Não configurado'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtida no painel Asaas em Integrações → API Key
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asaas-environment">Ambiente</Label>
                  <Select value={asaasEnvironment} onValueChange={(v: any) => setAsaasEnvironment(v)}>
                    <SelectTrigger id="asaas-environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use Sandbox para testes, Produção para cobranças reais
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="asaas-webhook">Webhook Token</Label>
                  <Input
                    id="asaas-webhook"
                    type="password"
                    value={asaasWebhookToken}
                    onChange={(e) => setAsaasWebhookToken(e.target.value)}
                    placeholder={cfg?.asaasWebhookTokenMasked ?? 'Não configurado'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Token de segurança para validar webhooks. Configure no Asaas: <code className="bg-muted px-1 py-0.5 rounded">POST /api/v1/webhooks/asaas</code> com header <code className="bg-muted px-1 py-0.5 rounded">x-webhook-token</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <a
                  href="https://docs.asaas.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Documentação Asaas
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Button disabled={saving} onClick={saveAsaas}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* InfinityPay Tab */}
        <TabsContent value="infinitypay" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração InfinityPay</CardTitle>
                  <CardDescription>
                    Configure suas credenciais do InfinityPay (integração em beta)
                  </CardDescription>
                </div>
                {isInfinityConfigured ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A integração com InfinityPay está em beta. Certifique-se de ter as credenciais corretas antes de ativar.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="infinity-merchant">Merchant ID</Label>
                  <Input
                    id="infinity-merchant"
                    type="password"
                    value={infinityPayMerchantId}
                    onChange={(e) => setInfinityPayMerchantId(e.target.value)}
                    placeholder={cfg?.infinityPayMerchantIdMasked ?? 'Não configurado'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infinity-api-key">API Key</Label>
                  <Input
                    id="infinity-api-key"
                    type="password"
                    value={infinityPayApiKey}
                    onChange={(e) => setInfinityPayApiKey(e.target.value)}
                    placeholder={cfg?.infinityPayApiKeyMasked ?? 'Não configurado'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infinity-public-key">Public Key</Label>
                  <Input
                    id="infinity-public-key"
                    type="password"
                    value={infinityPayPublicKey}
                    onChange={(e) => setInfinityPayPublicKey(e.target.value)}
                    placeholder={cfg?.infinityPayPublicKeyMasked ?? 'Não configurado'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infinity-webhook-secret">Webhook Secret</Label>
                  <Input
                    id="infinity-webhook-secret"
                    type="password"
                    value={infinityPayWebhookSecret}
                    onChange={(e) => setInfinityPayWebhookSecret(e.target.value)}
                    placeholder={cfg?.infinityPayWebhookSecretMasked ?? 'Não configurado'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Configure o webhook: <code className="bg-muted px-1 py-0.5 rounded">POST /api/v1/webhooks/infinitypay</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Contate o suporte InfinityPay para obter suas credenciais
                </span>
                <Button disabled={saving} variant="secondary" onClick={saveInfinity}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
