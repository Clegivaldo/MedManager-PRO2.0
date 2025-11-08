import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, CreditCard, Package, FileText, CheckCircle } from 'lucide-react';

interface Sale {
  id: string;
  orderId: string;
  client: string;
  date: string;
  total: number;
  payment: string;
  nfeStatus: string;
}

interface SaleDetailsModalProps {
  sale: Sale | null;
}

const saleItems = [
    { name: 'Paracetamol 500mg', quantity: 10, price: 12.50 },
    { name: 'Amoxicilina 875mg', quantity: 5, price: 28.90 },
];

export default function SaleDetailsModal({ sale }: SaleDetailsModalProps) {
  if (!sale) return null;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Detalhes da Venda {sale.id}</DialogTitle>
        <DialogDescription>
          Visualizando informações da venda para <span className="font-bold">{sale.client}</span>, originada do pedido {sale.orderId}.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoItem icon={User} label="Cliente" value={sale.client} />
            <InfoItem icon={Calendar} label="Data da Venda" value={sale.date} />
            <InfoItem icon={CreditCard} label="Pagamento" value={sale.payment} />
            <InfoItem icon={FileText} label="Status NFe" value={<Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Emitida</Badge>} />
        </div>
        <Separator />
        <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5"/> Itens da Venda</h3>
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
                        {saleItems.map(item => (
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
            <span className="text-lg font-semibold">Total da Venda:</span>
            <span className="text-2xl font-bold text-primary">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <div className="font-semibold">{value}</div>
    </div>
)
