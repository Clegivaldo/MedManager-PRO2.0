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

interface CancelNFeModalProps {
  nfe: { id: string; client: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (justification: string) => Promise<void> | void;
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function CancelNFeModal({ nfe, open, onOpenChange, onConfirm }: CancelNFeModalProps) {
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!nfe) return null;

  const handleConfirm = async () => {
    if (!onConfirm) {
      onOpenChange(false);
      return;
    }
    if (justification.trim().length < 15) return;
    try {
      setSubmitting(true);
      await onConfirm(justification.trim());
      setJustification('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

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
            <Textarea
              id="justification"
              placeholder="Digite a justificativa (mínimo 15 caracteres)..."
              className="mt-2"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirm}
              disabled={submitting || justification.trim().length < 15}
            >
              {submitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
