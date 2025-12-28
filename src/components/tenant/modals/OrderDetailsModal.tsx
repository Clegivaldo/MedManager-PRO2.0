import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Truck, CreditCard, Package } from 'lucide-react';
import { Order } from '@/services/order.service';

interface OrderDetailsModalProps {
  order: Order | null;
}

export default function OrderDetailsModal({ order }: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Detalhes do Pedido {order.id}</DialogTitle>
        <DialogDescription>
          Visualizando informações completas do pedido para <span className="font-bold">{order.customer?.companyName || order.customer?.cnpjCpf}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <InfoItem icon={User} label="Cliente" value={order.customer?.companyName || 'N/A'} />
          <InfoItem icon={Calendar} label="Data do Pedido" value={new Date(order.createdAt).toLocaleDateString('pt-BR')} />
          <InfoItem icon={Truck} label="Previsão de Entrega" value={order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : '-'} />
          <InfoItem icon={CreditCard} label="Pagamento" value={order.paymentMethod || '-'} />
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5" /> Itens do Pedido</h3>
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
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product?.name || 'Produto'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">R$ {Number(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">R$ {(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum item encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 pt-4 border-t">
          <span className="text-lg font-semibold">Total do Pedido:</span>
          <span className="text-2xl font-bold text-primary">R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
  <div>
    <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3" />{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
)
