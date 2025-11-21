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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import superadminService from '@/services/superadmin.service';

interface Tenant {
  id: string;
  name: string;
  status: string;
}

interface ToggleTenantStatusModalProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggled?: () => void;
}

export default function ToggleTenantStatusModal({ tenant, open, onOpenChange, onToggled }: ToggleTenantStatusModalProps) {
  if (!tenant) return null;

  const isActivating = tenant.status !== 'active';
  const actionText = isActivating ? 'Ativar' : 'Desativar';
  const actionColor = isActivating ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const newStatus = isActivating ? 'active' : 'inactive';
      await superadminService.updateTenantStatus(tenant.id, newStatus);
      toast({ title: `Tenant ${isActivating ? 'ativado' : 'desativado'} com sucesso` });
      onToggled?.();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem certeza que deseja <span className="font-bold">{actionText.toLowerCase()}</span> o tenant <span className="font-bold">{tenant.name}</span>?
            { !isActivating && " A empresa e seus usuários perderão o acesso ao sistema." }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={actionColor} onClick={confirm} disabled={loading}>
            {loading ? 'Processando...' : actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
