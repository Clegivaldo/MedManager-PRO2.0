import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import superadminService from '@/services/superadmin.service';

interface Tenant {
  id: string;
  name: string;
  subscriptionEnd?: string;
}

interface ExtendSubscriptionModalProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtended?: () => void;
}

export default function ExtendSubscriptionModal({ tenant, open, onOpenChange, onExtended }: ExtendSubscriptionModalProps) {
  const { toast } = useToast();
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!tenant) return null;

  const confirm = async () => {
    if (!tenant || months < 1) return;
    try {
      setLoading(true);
      await superadminService.extendSubscription(tenant.id, months);
      toast({ title: `Licença estendida por ${months} ${months === 1 ? 'mês' : 'meses'}` });
      onExtended?.();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao estender licença', variant: 'destructive' });
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  const currentEnd = tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd) : new Date();
  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + months);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Estender Licença</AlertDialogTitle>
          <AlertDialogDescription>
            Estendendo a licença para <span className="font-bold">{tenant.name}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="months">Quantidade de meses</Label>
            <Input
              id="months"
              type="number"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Vencimento atual:</span>
              <span className="font-medium">{currentEnd.toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Novo vencimento:</span>
              <span className="font-medium text-green-600">{newEnd.toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={loading || months < 1}>
            {loading ? 'Processando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
