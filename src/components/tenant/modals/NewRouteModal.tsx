import { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Route, ShoppingCart } from 'lucide-react';

const pendingOrders = [
  { id: '#PED-2024-005', client: 'Drogaria Pacheco', address: 'Rua das Flores, 123' },
  { id: '#PED-2024-006', client: 'Farma & Cia', address: 'Av. Principal, 456' },
  { id: '#PED-2024-007', client: 'Saúde Total', address: 'Praça Central, 789' },
];

export default function NewRouteModal() {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Criar Nova Rota de Entrega</DialogTitle>
        <DialogDescription>Selecione um motorista, veículo e os pedidos que farão parte desta rota.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-date">Data da Rota</Label>
            <Input id="route-date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver">Motorista</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="driver-1">João Santos</SelectItem>
                <SelectItem value="driver-2">Maria Silva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle-1">ABC-1234 (Fiorino)</SelectItem>
                <SelectItem value="vehicle-2">DEF-5678 (Strada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Pedidos Pendentes</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto p-4 space-y-3">
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center space-x-3">
                <Checkbox id={`order-${order.id}`} onCheckedChange={() => handleSelectOrder(order.id)} />
                <Label htmlFor={`order-${order.id}`} className="flex flex-col">
                  <span className="font-semibold">{order.id} - {order.client}</span>
                  <span className="text-xs text-muted-foreground">{order.address}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button><Route className="h-4 w-4 mr-2" />Criar Rota</Button>
      </DialogFooter>
    </DialogContent>
  );
}
