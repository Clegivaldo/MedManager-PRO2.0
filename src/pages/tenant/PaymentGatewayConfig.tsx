import { useEffect, useState } from 'react';
import { getPaymentGatewayCredentials, updatePaymentGatewayCredentials, getErrorMessage, PaymentGatewayMasked, UpdatePaymentGatewayDTO } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function PaymentGatewayConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PaymentGatewayMasked | null>(null);

  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [infinityApiKey, setInfinityApiKey] = useState('');
  const [asaasWebhookSecret, setAsaasWebhookSecret] = useState('');
  const [infinityWebhookSecret, setInfinityWebhookSecret] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const creds = await getPaymentGatewayCredentials();
        setData(creds);
      } catch (e) {
        toast({ title: 'Erro ao carregar', description: getErrorMessage(e), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  async function handleSave(gateway: 'asaas' | 'infinitypay') {
    setSaving(true);
    try {
      const payload: UpdatePaymentGatewayDTO = {};
      if (gateway === 'asaas') {
        if (asaasApiKey) payload.asaasApiKey = asaasApiKey.trim();
        if (asaasWebhookSecret) payload.asaasWebhookSecret = asaasWebhookSecret.trim();
      } else {
        if (infinityApiKey) payload.infinityPayApiKey = infinityApiKey.trim();
        if (infinityWebhookSecret) payload.infinityPayWebhookSecret = infinityWebhookSecret.trim();
      }
      if (Object.keys(payload).length === 0) {
        toast({ title: 'Nada para salvar', description: 'Informe pelo menos um campo.', variant: 'default' });
        return;
      }
      const updated = await updatePaymentGatewayCredentials(payload);
      setData(updated);
      toast({ title: 'Salvo', description: 'Credenciais atualizadas com sucesso.' });
      if (gateway === 'asaas') {
        setAsaasApiKey('');
        setAsaasWebhookSecret('');
      } else {
        setInfinityApiKey('');
        setInfinityWebhookSecret('');
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando credenciais...</div>;
  }

  return (
    <div className="p-6 space-y-10 max-w-4xl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Gateways de Pagamento</h1>
        <p className="text-sm text-muted-foreground">Gerencie as chaves de API e segredos de webhook para Asaas e InfinityPay. Os valores são armazenados de forma criptografada e nunca retornam completamente após salvos.</p>
      </header>

      {/* ASAAS */}
      <section className="border rounded-lg p-5 space-y-4 bg-card shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">Asaas {data?.hasAsaas && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">CONFIGURADO</span>}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="asaasApiKey">API Key (nova)</Label>
            <Input id="asaasApiKey" placeholder={data?.asaasApiKeyMasked || '********'} value={asaasApiKey} onChange={e => setAsaasApiKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">Deixe em branco para manter a atual.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asaasWebhookSecret">Webhook Secret (novo)</Label>
            <Input id="asaasWebhookSecret" placeholder={data?.asaasWebhookSecretMasked || '********'} value={asaasWebhookSecret} onChange={e => setAsaasWebhookSecret(e.target.value)} />
            <p className="text-xs text-muted-foreground">Opcional. Necessário para validar eventos.</p>
          </div>
        </div>
        <Button disabled={saving} onClick={() => handleSave('asaas')}>Salvar Asaas</Button>
      </section>

      {/* InfinityPay */}
      <section className="border rounded-lg p-5 space-y-4 bg-card shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">InfinityPay {data?.hasInfinityPay && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">CONFIGURADO</span>}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="infinityApiKey">API Key (nova)</Label>
            <Input id="infinityApiKey" placeholder={data?.infinityPayApiKeyMasked || '********'} value={infinityApiKey} onChange={e => setInfinityApiKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">Deixe em branco para manter a atual.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="infinityWebhookSecret">Webhook Secret (novo)</Label>
            <Input id="infinityWebhookSecret" placeholder={data?.infinityPayWebhookSecretMasked || '********'} value={infinityWebhookSecret} onChange={e => setInfinityWebhookSecret(e.target.value)} />
            <p className="text-xs text-muted-foreground">Opcional. Necessário para validar eventos.</p>
          </div>
        </div>
        <Button disabled={saving} variant="secondary" onClick={() => handleSave('infinitypay')}>Salvar InfinityPay</Button>
      </section>

      <div className="text-xs text-muted-foreground pt-2">
        As credenciais são cifradas com AES-256-GCM antes de persistir. Atualizações são auditadas no backend.
      </div>
    </div>
  );
}
