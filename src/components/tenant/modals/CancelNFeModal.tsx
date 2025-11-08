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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NFe {
  id: string;
  client: string;
}

interface CancelNFeModalProps {
  nfe: NFe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CancelNFeModal({ nfe, open, onOpenChange }: CancelNFeModalProps) {
  if (!nfe) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Nota Fiscal</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a cancelar a NFe <span className="font-bold">{nfe.id}</span> para o cliente <span className="font-bold">{nfe.client}</span>. Esta ação é irreversível.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
            <Label htmlFor="justification">Justificativa de Cancelamento</Label>
            <Textarea id="justification" placeholder="Digite a justificativa (mínimo 15 caracteres)..." className="mt-2"/>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700">
            Confirmar Cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
