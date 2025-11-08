import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer } from 'lucide-react';

interface RegisterTemperatureModalProps {
  warehouseName: string;
}

export default function RegisterTemperatureModal({ warehouseName }: RegisterTemperatureModalProps) {
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-primary"/>
            Registrar Temperatura
        </DialogTitle>
        <DialogDescription>
          Medição manual para o <span className="font-bold">{warehouseName}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperatura (°C)</Label>
          <Input id="temperature" type="number" step="0.1" placeholder="Ex: 4.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observações (Opcional)</Label>
          <Input id="notes" placeholder="Ex: Medição após abertura da porta" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Registrar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
