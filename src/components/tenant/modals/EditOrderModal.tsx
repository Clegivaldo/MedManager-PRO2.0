import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import orderService, { Order } from '@/services/order.service';

interface EditOrderModalProps {
  order: Order | null;
  onSuccess?: () => void;
}

export default function EditOrderModal({ order, onSuccess }: EditOrderModalProps) {
  const [status, setStatus] = useState('PENDING');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
      setNotes(order.notes || '');
    }
  }, [order]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await orderService.update(order!.id, {
        status: status as any,
        deliveryDate: deliveryDate || undefined,
        notes,
      });

      toast({
        title: 'Sucesso',
        description: 'Pedido atualizado com sucesso!',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível atualizar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <DialogContent className="max-w-lg">
        <div className="p-6 text-center text-muted-foreground">
          Carregando pedido...
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Editar Pedido {order.id}</DialogTitle>
        <DialogDescription>
          Alterando informações do pedido para <span className="font-bold">{order.customer?.companyName}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="order-status">Status do Pedido</Label>
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger id="order-status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="PROCESSING">Processando</SelectItem>
              <SelectItem value="SHIPPED">Enviado</SelectItem>
              <SelectItem value="DELIVERED">Entregue</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="delivery-date">Data de Entrega</Label>
          <Input
            id="delivery-date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre o pedido"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={loading}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
