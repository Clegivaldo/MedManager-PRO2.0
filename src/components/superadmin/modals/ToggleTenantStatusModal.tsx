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

interface Tenant {
  id: string;
  name: string;
  status: string;
}

interface ToggleTenantStatusModalProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ToggleTenantStatusModal({ tenant, open, onOpenChange }: ToggleTenantStatusModalProps) {
  if (!tenant) return null;

  const isActivating = tenant.status !== 'active';
  const actionText = isActivating ? 'Ativar' : 'Desativar';
  const actionColor = isActivating ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

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
          <AlertDialogAction className={actionColor}>
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
