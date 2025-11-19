import { useEffect, useMemo, useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { X, FileText, Shield } from 'lucide-react';
import customerService, { Customer } from '@/services/customer.service';
import productService, { Product } from '@/services/product.service';
import invoiceService, { CreateInvoiceDTO } from '@/services/invoice.service';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import BatchSelectionModal from './BatchSelectionModal';

interface NewNFeModalProps {
  onCreated?: () => void;
}

interface NFeItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  productId: string;
  isControlled?: boolean;
  batchId?: string;
  batchNumber?: string;
}

export default function NewNFeModal({ onCreated }: NewNFeModalProps) {
  const [nfeItems, setNfeItems] = useState<NFeItem[]>([]);
  const [openProductSearch, setOpenProductSearch] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [cust, prod] = await Promise.all([
          customerService.list({ page: 1, limit: 50, status: 'active' }),
          productService.list({ page: 1, limit: 100, status: 'active' }),
        ]);
        setCustomers(cust.customers || []);
        setProducts(prod.products || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const addProductToNFe = (product: Product) => {
    if (product.isControlled) {
      // Para produtos controlados, abrir modal de seleção de lote
      setSelectedProduct(product);
      setBatchModalOpen(true);
      return;
    }
    
    // Para produtos não controlados, adicionar diretamente
    setNfeItems(prev => [
      ...prev,
      {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: 0,
        total: 0,
        isControlled: false,
      }
    ]);
  };

  const handleBatchSelected = (batch: any, quantity: number) => {
    if (!selectedProduct) return;
    
    setNfeItems(prev => [
      ...prev,
      {
        id: `${selectedProduct.id}-${batch.id}-${Date.now()}`,
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity,
        price: 0,
        total: 0,
        isControlled: true,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
      }
    ]);
    
    setSelectedProduct(null);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setNfeItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity, total: quantity * item.price } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const updateUnitPrice = (productId: string, price: number) => {
    setNfeItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, price, total: item.quantity * price } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setNfeItems(prev => prev.filter(item => item.id !== productId));
  };

  const totalNFeValue = nfeItems.reduce((sum, item) => sum + item.total, 0);

  const canSubmit = useMemo(() => selectedCustomer && nfeItems.length > 0 && nfeItems.every(i => i.quantity > 0 && i.price > 0), [selectedCustomer, nfeItems]);

  const handleEmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const payload: CreateInvoiceDTO = {
        customerId: selectedCustomer,
        items: nfeItems.map(i => ({ 
          productId: i.productId, 
          quantity: i.quantity, 
          unitPrice: i.price, 
          discount: 0,
          batchId: i.batchId, // Incluir lote para produtos controlados
        })),
        paymentMethod: 'pix',
        installments: 1,
        operationType: 'sale',
        cfop: '5405',
        naturezaOperacao: 'VENDA DE MERCADORIA PARA TERCEIROS',
      };
      const draft = await invoiceService.create(payload);
      await invoiceService.emit(draft.id);
      toast({ title: 'NF-e emitida com sucesso' });
      setNfeItems([]);
      setSelectedCustomer('');
      onCreated?.();
    } catch (e) {
      toast({ title: 'Falha ao emitir NF-e', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

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
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName} • {c.cnpjCpf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Adicionar Produtos</Label>
            <Command>
              <CommandInput placeholder="Buscar produto..." onFocus={() => setOpenProductSearch(true)} />
              {openProductSearch && (
                <CommandList><CommandEmpty>Nenhum produto encontrado.</CommandEmpty><CommandGroup>
                    {products.map((product) => (
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
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Preço Unit.</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {nfeItems.length > 0 ? (
                  nfeItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.isControlled && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                <Shield className="h-3 w-3 mr-1" />
                                Controlado
                              </Badge>
                            )}
                          </div>
                          {item.batchNumber && (
                            <span className="text-xs text-gray-500">Lote: {item.batchNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.isControlled ? (
                          <span className="text-sm">{item.quantity}</span>
                        ) : (
                          <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))} className="h-8 w-16" min="1" />
                        )}
                      </TableCell>
                      <TableCell><Input type="number" value={item.price} onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value))} className="h-8 w-24" min="0" step="0.01" /></TableCell>
                      <TableCell>R$ {item.total.toFixed(2)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}><X className="h-4 w-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum produto adicionado.</TableCell></TableRow>
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
        <Button onClick={handleEmit} disabled={!canSubmit || submitting}>{submitting ? 'Emitindo...' : 'Emitir NFe'}</Button>
      </DialogFooter>

      {/* Modal de seleção de lote para produtos controlados */}
      {selectedProduct && (
        <BatchSelectionModal
          open={batchModalOpen}
          onClose={() => {
            setBatchModalOpen(false);
            setSelectedProduct(null);
          }}
          onSelect={handleBatchSelected}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          isControlled={selectedProduct.isControlled || false}
        />
      )}
    </DialogContent>
  );
}
