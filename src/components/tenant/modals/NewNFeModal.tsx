import { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, FileText } from 'lucide-react';

const availableProducts = [
  { id: 'PRD-001', name: 'Paracetamol 500mg', price: 12.50 },
  { id: 'PRD-002', name: 'Amoxicilina 875mg', price: 28.90 },
];

interface NFeItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function NewNFeModal() {
  const [nfeItems, setNfeItems] = useState<NFeItem[]>([]);
  const [openProductSearch, setOpenProductSearch] = useState(false);

  const addProductToNFe = (product: typeof availableProducts[0]) => {
    setNfeItems(prev => [...prev, { id: product.id, name: product.name, quantity: 1, price: product.price, total: product.price }]);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setNfeItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity, total: quantity * item.price } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setNfeItems(prev => prev.filter(item => item.id !== productId));
  };

  const totalNFeValue = nfeItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Emitir Nova Nota Fiscal Avulsa</DialogTitle>
        <DialogDescription>Preencha os dados para gerar uma nova NFe.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cli-001">Drogaria São Paulo</SelectItem>
                <SelectItem value="cli-002">Farmácia Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Adicionar Produtos</Label>
            <Command>
              <CommandInput placeholder="Buscar produto..." onFocus={() => setOpenProductSearch(true)} />
              {openProductSearch && (
                <CommandList><CommandEmpty>Nenhum produto encontrado.</CommandEmpty><CommandGroup>
                    {availableProducts.map((product) => (
                      <CommandItem key={product.id} onSelect={() => { addProductToNFe(product); setOpenProductSearch(false); }}>
                        {product.name}
                      </CommandItem>
                    ))}
                </CommandGroup></CommandList>
              )}
            </Command>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2"><FileText className="h-5 w-5" /> Itens da Nota</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {nfeItems.length > 0 ? (
                  nfeItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))} className="h-8 w-16" min="1" /></TableCell>
                      <TableCell>R$ {item.total.toFixed(2)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}><X className="h-4 w-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum produto adicionado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total da Nota:</span>
            <span className="text-2xl font-bold text-primary">R$ {totalNFeValue.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Emitir NFe</Button>
      </DialogFooter>
    </DialogContent>
  );
}
