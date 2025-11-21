import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getGlobalPaymentConfig, updateGlobalPaymentConfig, GlobalPaymentConfigMasked } from '@/services/superadmin-payments.service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      if (asaasApiKey) update.asaasApiKey = asaasApiKey.trim();
      if (asaasWebhookToken) update.asaasWebhookToken = asaasWebhookToken.trim();
      const updated = await updateGlobalPaymentConfig(update);
      setCfg(updated);
      setAsaasApiKey('');
      setAsaasWebhookToken('');
      toast({ title: 'Salvo', description: 'Configurações Asaas atualizadas.' });
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
      toast({ title: 'Gateway ativo atualizado', description: `Agora usando: ${activeGateway.toUpperCase()}` });
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
      if (infinityPayMerchantId) update.infinityPayMerchantId = infinityPayMerchantId.trim();
      if (infinityPayApiKey) update.infinityPayApiKey = infinityPayApiKey.trim();
      if (infinityPayPublicKey) update.infinityPayPublicKey = infinityPayPublicKey.trim();
      if (infinityPayWebhookSecret) update.infinityPayWebhookSecret = infinityPayWebhookSecret.trim();
      const updated = await updateGlobalPaymentConfig(update);
      setCfg(updated);
      setInfinityPayMerchantId('');
      setInfinityPayApiKey('');
      setInfinityPayPublicKey('');
      setInfinityPayWebhookSecret('');
      toast({ title: 'Salvo', description: 'Credenciais InfinityPay atualizadas.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Pagamentos da Plataforma</h1>
        <p className="text-sm text-muted-foreground">Configure as credenciais globais usadas para cobrar os tenants (assinaturas). Valores são armazenados de forma criptografada.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Gateway Ativo</div>
            <div className="text-lg font-medium">{activeGateway.toUpperCase()}</div>
          </div>
          <Select value={activeGateway} onValueChange={(v: any) => setActiveGateway(v)}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione o gateway" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asaas">Asaas</SelectItem>
              <SelectItem value="infinitypay">InfinityPay (beta)</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={saving} onClick={saveActiveGateway}>Salvar</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Asaas</h2>
          {cfg?.asaasApiKeyMasked ? <Badge variant="secondary">CONFIGURADO</Badge> : <Badge variant="outline">PENDENTE</Badge>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>API Key (nova)</Label>
            <Input value={asaasApiKey} onChange={(e) => setAsaasApiKey(e.target.value)} placeholder={cfg?.asaasApiKeyMasked || '********'} />
            <p className="text-xs text-muted-foreground">Deixe em branco para manter a atual.</p>
          </div>
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select value={asaasEnvironment} onValueChange={(v: any) => setAsaasEnvironment(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Webhook Token (novo)</Label>
            <Input value={asaasWebhookToken} onChange={(e) => setAsaasWebhookToken(e.target.value)} placeholder={cfg?.asaasWebhookTokenMasked || '********'} />
            <p className="text-xs text-muted-foreground">Use este token no header x-webhook-token para validar os eventos.</p>
          </div>
        </div>
        <Button disabled={saving} onClick={saveAsaas}>Salvar Asaas</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">InfinityPay</h2>
          {cfg?.infinityPayApiKeyMasked ? <Badge variant="secondary">CONFIGURADO</Badge> : <Badge variant="outline">PENDENTE</Badge>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Merchant ID (novo)</Label>
            <Input value={infinityPayMerchantId} onChange={(e) => setInfinityPayMerchantId(e.target.value)} placeholder={cfg?.infinityPayMerchantIdMasked || '********'} />
          </div>
          <div className="space-y-2">
            <Label>API Key (nova)</Label>
            <Input value={infinityPayApiKey} onChange={(e) => setInfinityPayApiKey(e.target.value)} placeholder={cfg?.infinityPayApiKeyMasked || '********'} />
          </div>
          <div className="space-y-2">
            <Label>Public Key (nova)</Label>
            <Input value={infinityPayPublicKey} onChange={(e) => setInfinityPayPublicKey(e.target.value)} placeholder={cfg?.infinityPayPublicKeyMasked || '********'} />
          </div>
          <div className="space-y-2">
            <Label>Webhook Secret (novo)</Label>
            <Input value={infinityPayWebhookSecret} onChange={(e) => setInfinityPayWebhookSecret(e.target.value)} placeholder={cfg?.infinityPayWebhookSecretMasked || '********'} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={saving} variant="secondary" onClick={saveInfinity}>Salvar InfinityPay</Button>
          <span className="text-xs text-muted-foreground">Integração de cobrança pelo InfinityPay está em preparação.</span>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Dica: Configure o webhook do Asaas para POST em <code>/api/v1/webhooks/asaas</code> com header <code>x-webhook-token</code> usando o token acima.
      </div>
    </div>
  );
}
