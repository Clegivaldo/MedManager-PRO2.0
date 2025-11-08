import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Package } from 'lucide-react';

interface Quote {
  id: string;
  client: string;
  date: string;
  validity: string;
  total: number;
}

interface QuoteDetailsModalProps {
  quote: Quote | null;
}

const quoteItems = [
    { name: 'Paracetamol 500mg', quantity: 10, price: 12.50 },
    { name: 'Amoxicilina 875mg', quantity: 5, price: 28.90 },
];

export default function QuoteDetailsModal({ quote }: QuoteDetailsModalProps) {
  if (!quote) return null;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Detalhes do Orçamento {quote.id}</DialogTitle>
        <DialogDescription>
          Visualizando informações do orçamento para <span className="font-bold">{quote.client}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoItem icon={User} label="Cliente" value={quote.client} />
            <InfoItem icon={Calendar} label="Data de Emissão" value={quote.date} />
            <InfoItem icon={Calendar} label="Validade" value={quote.validity} />
        </div>
        <Separator />
        <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5"/> Itens do Orçamento</h3>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {quoteItems.map(item => (
                            <TableRow key={item.name}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right font-medium">R$ {(item.quantity * item.price).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
        <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
