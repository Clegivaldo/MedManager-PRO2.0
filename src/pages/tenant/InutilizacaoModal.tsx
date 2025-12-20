
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import invoiceService from '@/services/invoice.service';
import { getErrorMessage } from '@/services/api';
import { Loader2, Trash2 } from 'lucide-react';

interface InutilizacaoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function InutilizacaoModal({ isOpen, onClose, onSuccess }: InutilizacaoModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [justification, setJustification] = useState('');
    const [serie, setSerie] = useState('');
    const [numIni, setNumIni] = useState('');
    const [numFin, setNumFin] = useState('');

    const handleSend = async () => {
        if (justification.length < 15) {
            toast({
                title: 'Texto muito curto',
                description: 'A justificativa deve ter no mínimo 15 caracteres.',
                variant: 'destructive',
            });
            return;
        }
        if (!serie || !numIni || !numFin) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Preencha série e numeração inicial/final.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await invoiceService.inutilize(serie, numIni, numFin, justification);
            toast({
                title: 'Numeração Inutilizada',
                description: 'A solicitação foi homologada com sucesso.',
            });
            onSuccess();
            handleClose();
        } catch (error) {
            toast({
                title: 'Erro ao inutilizar',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSerie('');
        setNumIni('');
        setNumFin('');
        setJustification('');
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Inutilizar Numeração (NF-e)</DialogTitle>
                    <DialogDescription>
                        Informe a série e o intervalo de números que não foram utilizados e devem ser inutilizados na SEFAZ.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="serie">Série</Label>
                            <Input
                                id="serie"
                                placeholder="001"
                                value={serie}
                                onChange={(e) => setSerie(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="numIni">Nº Inicial</Label>
                            <Input
                                id="numIni"
                                type="number"
                                placeholder="100"
                                value={numIni}
                                onChange={(e) => setNumIni(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="numFin">Nº Final</Label>
                            <Input
                                id="numFin"
                                type="number"
                                placeholder="100"
                                value={numFin}
                                onChange={(e) => setNumFin(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="justification">Justificativa</Label>
                        <Textarea
                            id="justification"
                            placeholder="Descreva o motivo (ex: erro de pulação de numeração)..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            className="resize-none h-24"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {justification.length} caracteres (mínimo 15)
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSend} variant="destructive" disabled={loading || justification.length < 15}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Inutilizar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
