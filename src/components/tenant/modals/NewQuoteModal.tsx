import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import quoteService from '@/services/quote.service';
import customerService, { Customer } from '@/services/customer.service';
import productService, { Product } from '@/services/product.service';

interface QuoteItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NewQuoteModalProps {
  onSuccess?: () => void;
}

export default function NewQuoteModal({ onSuccess }: NewQuoteModalProps) {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [openProductSearch, setOpenProductSearch] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerService.list({ limit: 1000 });
      setCustomers(response?.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.list({ limit: 1000 });
      setProducts(response?.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos.',
        variant: 'destructive',
      });
    }
  };

  const addProductToQuote = (product: Product) => {
    setQuoteItems(prev => {
      const existingItem = prev.find(item => item.productId === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } 
            : item
        );
      }
      // Usar preço de venda do produto - aqui assumimos 50 reais como exemplo
      const unitPrice = 50.00; // TODO: Obter preço real do produto
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        quantity: 1, 
        unitPrice, 
        totalPrice: unitPrice 
      }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setQuoteItems(prev =>
      prev.map(item =>
        item.productId === productId 
          ? { ...item, quantity, totalPrice: quantity * item.unitPrice } 
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setQuoteItems(prev => prev.filter(item => item.productId !== productId));
  };

  const totalQuoteValue = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um cliente.',
        variant: 'destructive',
      });
      return;
    }

    if (!validUntil) {
      toast({
        title: 'Erro',
        description: 'Por favor, defina a data de validade.',
        variant: 'destructive',
      });
      return;
    }

    if (quoteItems.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um produto ao orçamento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await quoteService.create({
        customerId: selectedCustomerId,
        validUntil,
        items: quoteItems,
        notes,
      });

      toast({
        title: 'Sucesso',
        description: 'Orçamento criado com sucesso!',
      });

      // Limpar formulário
      setQuoteItems([]);
      setSelectedCustomerId('');
      setValidUntil('');
      setNotes('');

      // Chamar callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating quote:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível criar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Criar Novo Orçamento</DialogTitle>
        <DialogDescription>Selecione o cliente e adicione os produtos para a cotação.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.companyName || customer.tradeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="validity">Validade do Orçamento</Label>
            <Input 
              id="validity" 
              type="date" 
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o orçamento"
            />
          </div>
          <div className="space-y-2">
            <Label>Adicionar Produtos</Label>
            <Command>
              <CommandInput placeholder="Buscar produto..." onFocus={() => setOpenProductSearch(true)} />
              {openProductSearch && (
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                  <CommandGroup>
                    {products.map((product) => (
                      <CommandItem 
                        key={product.id} 
                        onSelect={() => { 
                          addProductToQuote(product); 
                          setOpenProductSearch(false); 
                        }}
                      >
                        {product.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2"><FileText className="h-5 w-5" /> Itens do Orçamento</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {quoteItems.length > 0 ? (
                  quoteItems.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)} 
                          className="h-8 w-16" 
                          min="1" 
                        />
                      </TableCell>
                      <TableCell>R$ {item.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => removeItem(item.productId)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum produto adicionado.
                    </TableCell>
                  </TableRow>
                )}
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
          <Button variant="outline" disabled={loading}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Criando...' : 'Criar Orçamento'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
