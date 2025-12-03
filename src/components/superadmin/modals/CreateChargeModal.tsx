import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface CreateChargeModalProps {
  open: boolean;
  tenantId?: string;
  tenantName?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ChargeResult {
  chargeId: string;
  status: string;
  dueDate: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
}

export default function CreateChargeModal({ open, tenantId, tenantName, onOpenChange, onSuccess }: CreateChargeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO'>('PIX');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<ChargeResult | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAmount('');
      setDescription('');
      setPaymentMethod('PIX');
      setResult(null);
    }
  }, [open]);

  async function handleCreate() {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    if (!tenantId) {
      toast({ title: 'Erro', description: 'Tenant não identificado', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/superadmin/tenants/${tenantId}/create-charge`, {
        amount: parseFloat(amount),
        paymentMethod,
        description: description || `Cobrança ${paymentMethod}`,
        billingCycle: 'monthly'
      });
      const charge = res.data.data;
      setResult(charge);
      toast({ title: 'Cobrança criada', description: `ID: ${charge.chargeId}` });
    } catch (e: any) {
      toast({ title: 'Erro ao criar cobrança', description: e?.message || 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setAmount('');
    setDescription('');
    setPaymentMethod('PIX');
    setResult(null);
    onOpenChange(false);
  }

  function handleSuccess() {
    setAmount('');
    setDescription('');
    setPaymentMethod('PIX');
    setResult(null);
    onSuccess?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Cobrança - {tenantName}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  console.log('Amount changed:', e.target.value);
                  setAmount(e.target.value);
                }}
                placeholder="1.00"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label htmlFor="method">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Renovação assinatura"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
              <p className="font-semibold text-green-900 dark:text-green-100">✓ Cobrança criada com sucesso</p>
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Charge ID:</span> <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{result.chargeId}</code>
              </div>
              <div>
                <span className="font-medium">Status:</span> {result.status}
              </div>
              <div>
                <span className="font-medium">Vencimento:</span> {new Date(result.dueDate).toLocaleDateString('pt-BR')}
              </div>
            </div>

            {result.pixQrCodeBase64 && (
              <div className="border-t pt-3">
                <p className="font-medium mb-2">QR Code PIX:</p>
                <img src={`data:image/png;base64,${result.pixQrCodeBase64}`} alt="QR Code PIX" className="w-32 h-32 border" />
                {result.pixQrCode && (
                  <p className="text-xs text-muted-foreground mt-2 break-all">{result.pixQrCode}</p>
                )}
              </div>
            )}

            {result.boletoUrl && (
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Boleto:</p>
                <Button variant="outline" size="sm" onClick={() => window.open(result.boletoUrl)} className="w-full">
                  Abrir PDF do Boleto
                </Button>
                {result.boletoBarcode && <p className="text-xs text-muted-foreground mt-2">{result.boletoBarcode}</p>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Criando...' : 'Criar Cobrança'}
              </Button>
            </>
          ) : (
            <Button onClick={handleSuccess}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
