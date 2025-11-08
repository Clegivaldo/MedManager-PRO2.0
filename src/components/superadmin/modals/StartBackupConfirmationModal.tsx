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

interface StartBackupConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  tenantName?: string;
}

export default function StartBackupConfirmationModal({ open, onOpenChange, onConfirm, tenantName }: StartBackupConfirmationModalProps) {
  const title = tenantName ? `Iniciar Backup para ${tenantName}` : "Iniciar Backup Geral";
  const description = tenantName
    ? `Você está prestes a iniciar um backup manual para o tenant ${tenantName}.`
    : "Você está prestes a iniciar um backup manual da base de dados principal do sistema.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} O processo pode levar alguns minutos. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Iniciar Backup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
