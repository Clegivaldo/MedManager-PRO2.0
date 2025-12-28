import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import quoteService, { Quote, QuoteItem } from '@/services/quote.service';
import productService, { Product } from '@/services/product.service';

interface EditQuoteModalProps {
  quote: Quote | null;
  onSuccess?: () => void;
}

export default function EditQuoteModal({ quote, onSuccess }: EditQuoteModalProps) {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [openProductSearch, setOpenProductSearch] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (quote) {
      setQuoteItems(quote.items || []);
      setValidUntil(quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '');
      setNotes(quote.notes || '');
      setStatus(quote.status);
    }
  }, [quote]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.list({ limit: 1000 });
      setProducts(response?.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
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
      const unitPrice = product.price || 0;
      return [...prev, {
        id: '',
        quoteId: quote?.id || '',
        productId: product.id,
        product,
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
      await quoteService.update(quote!.id, {
        validUntil,
        items: quoteItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        notes,
      });

      toast({
        title: 'Sucesso',
        description: 'Orçamento atualizado com sucesso!',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível atualizar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl">
      {quote ? (
        <>
          <DialogHeader>
            <DialogTitle>Editar Orçamento {quote.quoteNumber}</DialogTitle>
            <DialogDescription>
              Ajuste os detalhes do orçamento para o cliente {quote.customer?.companyName || quote.customer?.tradeName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Input
                  id="client"
                  value={quote.customer?.companyName || quote.customer?.tradeName || ''}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data de Criação</Label>
                <Input
                  id="date"
                  value={new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                  disabled
                />
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
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
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
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" /> Itens do Orçamento
              </h3>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.length > 0 ? (
                      quoteItems.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell>{item.product?.name || 'Produto'}</TableCell>
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <div className="p-6 text-center text-muted-foreground">
          Carregando orçamento...
        </div>
      )}
    </DialogContent>
  );
}
