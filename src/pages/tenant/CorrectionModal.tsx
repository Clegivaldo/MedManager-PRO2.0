import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import invoiceService from '@/services/invoice.service';
import { getErrorMessage } from '@/services/api';
import { Loader2, Send } from 'lucide-react';

interface CorrectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string;
    onSuccess: () => void;
}

export function CorrectionModal({ isOpen, onClose, invoiceId, onSuccess }: CorrectionModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState('');

    const handleSend = async () => {
        if (text.length < 15) {
            toast({
                title: 'Texto muito curto',
                description: 'A correção deve ter no mínimo 15 caracteres.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await invoiceService.correction(invoiceId, text);
            toast({
                title: 'Carta de Correção enviada',
                description: 'A correção foi registrada com sucesso.',
            });
            onSuccess();
            onClose();
            setText('');
        } catch (error) {
            toast({
                title: 'Erro ao enviar correção',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Carta de Correção Eletrônica (CC-e)</DialogTitle>
                    <DialogDescription>
                        Envie uma correção para a NF-e autorizada. O texto deve ter no mínimo 15 caracteres.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="correction-text">Correção</Label>
                        <Textarea
                            id="correction-text"
                            placeholder="Descreva a correção necessária..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="resize-none h-32"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {text.length} caracteres (mínimo 15)
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSend} disabled={loading || text.length < 15}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Enviar Correção
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
