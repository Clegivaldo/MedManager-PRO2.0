import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import orderService from '@/services/order.service';
import customerService, { Customer } from '@/services/customer.service';
import productService, { Product } from '@/services/product.service';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NewOrderModalProps {
  onSuccess?: () => void;
}

export default function NewOrderModal({ onSuccess }: NewOrderModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [openProductSearch, setOpenProductSearch] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
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
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.list({ limit: 1000 });
      setProducts(response?.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addProductToOrder = (product: Product) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => item.productId === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } 
            : item
        );
      }
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
    setOrderItems(prev =>
      prev.map(item =>
        item.productId === productId 
          ? { ...item, quantity, totalPrice: quantity * item.unitPrice } 
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const totalOrderValue = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um cliente.',
        variant: 'destructive',
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um produto ao pedido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await orderService.create({
        customerId: selectedCustomerId,
        deliveryDate: deliveryDate || undefined,
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        notes,
      });

      toast({
        title: 'Sucesso',
        description: 'Pedido criado com sucesso!',
      });

      setOrderItems([]);
      setSelectedCustomerId('');
      setDeliveryDate('');
      setNotes('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível criar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Criar Novo Pedido</DialogTitle>
        <DialogDescription>Selecione o cliente e adicione os produtos ao pedido.</DialogDescription>
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
            <Label htmlFor="deliveryDate">Data de Entrega (opcional)</Label>
            <Input 
              id="deliveryDate" 
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input 
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o pedido"
            />
          </div>
          <div className="space-y-2">
            <Label>Adicionar Produtos</Label>
            <Command>
              <CommandInput placeholder="Buscar produto por nome ou código..." onFocus={() => setOpenProductSearch(true)} />
              {openProductSearch && (
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                  <CommandGroup>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        onSelect={() => {
                          addProductToOrder(product);
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
          <h3 className="font-medium flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Itens do Pedido</h3>
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
                {orderItems.length > 0 ? (
                  orderItems.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.productId)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum produto adicionado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total do Pedido:</span>
            <span className="text-2xl font-bold text-primary">R$ {totalOrderValue.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={loading}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Criando...' : 'Criar Pedido'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
