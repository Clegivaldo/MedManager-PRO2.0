import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Order {
  id: string;
  client: string;
  status: string;
  deliveryDate: string;
}

interface EditOrderModalProps {
  order: Order | null;
}

export default function EditOrderModal({ order }: EditOrderModalProps) {
  if (!order) return null;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Editar Pedido {order.id}</DialogTitle>
        <DialogDescription>
          Alterando informações do pedido para <span className="font-bold">{order.client}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="order-status">Status do Pedido</Label>
          <Select defaultValue={order.status}>
            <SelectTrigger id="order-status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="delivery-date">Data de Entrega</Label>
          <Input id="delivery-date" type="date" defaultValue={order.deliveryDate} />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button>Salvar Alterações</Button>
      </DialogFooter>
    </DialogContent>
  );
}
