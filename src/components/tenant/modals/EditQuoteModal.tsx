import { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, FileText } from 'lucide-react';

interface Quote {
  id: string;
  client: string;
  date: string;
  validity: string;
  total: number;
}

interface EditQuoteModalProps {
  quote: Quote | null;
}

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function EditQuoteModal({ quote }: EditQuoteModalProps) {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { id: 'PRD-001', name: 'Paracetamol 500mg', quantity: 10, price: 12.50, total: 125 },
  ]);

  if (!quote) return null;

  const totalQuoteValue = quoteItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Editar Orçamento {quote.id}</DialogTitle>
        <DialogDescription>Ajuste os detalhes do orçamento para o cliente {quote.client}.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Input id="client" defaultValue={quote.client} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validity">Validade do Orçamento</Label>
            <Input id="validity" type="date" defaultValue={quote.validity} />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2"><FileText className="h-5 w-5" /> Itens do Orçamento</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader>
              <TableBody>
                {quoteItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell><Input type="number" value={item.quantity} className="h-8 w-16" min="1" /></TableCell>
                    <TableCell>R$ {item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">R$ {totalQuoteValue.toFixed(2)}</span>
          </div>
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
