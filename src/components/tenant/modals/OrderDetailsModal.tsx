import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Truck, CreditCard, Package } from 'lucide-react';

interface Order {
  id: string;
  client: string;
  date: string;
  status: string;
  totalValue: number;
  paymentMethod: string;
  deliveryDate: string;
}

interface OrderDetailsModalProps {
  order: Order | null;
}

const orderItems = [
    { name: 'Paracetamol 500mg', quantity: 10, price: 12.50 },
    { name: 'Amoxicilina 875mg', quantity: 5, price: 28.90 },
];

export default function OrderDetailsModal({ order }: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Detalhes do Pedido {order.id}</DialogTitle>
        <DialogDescription>
          Visualizando informações completas do pedido para <span className="font-bold">{order.client}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoItem icon={User} label="Cliente" value={order.client} />
            <InfoItem icon={Calendar} label="Data do Pedido" value={order.date} />
            <InfoItem icon={Truck} label="Previsão de Entrega" value={order.deliveryDate} />
            <InfoItem icon={CreditCard} label="Pagamento" value={order.paymentMethod} />
        </div>
        <Separator />
        <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5"/> Itens do Pedido</h3>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orderItems.map(item => (
                            <TableRow key={item.name}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">R$ {(item.quantity * item.price).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
        <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total do Pedido:</span>
            <span className="text-2xl font-bold text-primary">R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <p className="font-semibold">{value}</p>
    </div>
)
