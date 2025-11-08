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

interface Module {
    name: string;
    active: boolean;
}

interface ToggleModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  module: Module | null;
}

export default function ToggleModuleModal({ open, onOpenChange, onConfirm, module }: ToggleModuleModalProps) {
  if (!module) return null;

  const action = module.active ? 'Desativar' : 'Ativar';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Alteração</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem certeza que deseja <span className="font-bold">{action.toLowerCase()}</span> o módulo <span className="font-bold">{module.name}</span> para toda a plataforma?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={!module.active ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
