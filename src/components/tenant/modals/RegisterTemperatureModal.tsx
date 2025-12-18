import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer, Loader2 } from 'lucide-react';
import { useState } from 'react';
import temperatureService from '@/services/temperature.service';
import { useToast } from '@/hooks/use-toast';

interface RegisterTemperatureModalProps {
  warehouseName: string;
  warehouseId?: string;
  onSuccess?: () => void;
}

export default function RegisterTemperatureModal({ warehouseName, warehouseId, onSuccess }: RegisterTemperatureModalProps) {
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) {
      toast({
        title: 'Erro',
        description: 'Armazém não selecionado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await temperatureService.record({
        warehouseId,
        temperature: parseFloat(temperature),
        humidity: humidity ? parseFloat(humidity) : undefined,
      });

      if (result.isAlert) {
        toast({
          title: '⚠️ Alerta de Temperatura',
          description: result.alertMessage || 'Temperatura fora do intervalo permitido',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Temperatura registrada',
          description: 'A leitura foi registrada com sucesso.',
        });
      }

      setTemperature('');
      setHumidity('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível registrar a temperatura.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Thermometer className="h-6 w-6 text-primary" />
          Registrar Temperatura
        </DialogTitle>
        <DialogDescription>
          Medição manual para o <span className="font-bold">{warehouseName}</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperatura (°C) *</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="Ex: 4.5"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="humidity">Umidade (%)</Label>
            <Input
              id="humidity"
              type="number"
              step="0.1"
              placeholder="Ex: 65.0"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={loading}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
