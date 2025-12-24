import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Receipt, Loader2, ShoppingCart, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import api from '@/services/api';

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    ean?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface Customer {
    id: string;
    name: string;
    cpf?: string;
    cnpj?: string;
}

const PDV: React.FC = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'01' | '03' | '04' | '17'>('01');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [amountReceived, setAmountReceived] = useState('');

    // Fetch products
    const { data: products = [], isLoading: loadingProducts } = useQuery({
        queryKey: ['pdv-products', searchTerm],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 2) return [];
            const response = await api.get('/products', {
                params: { search: searchTerm, limit: 10 }
            });
            return response.data.products || response.data || [];
        },
        enabled: searchTerm.length >= 2,
    });

    // Fetch customers for modal
    const { data: customers = [] } = useQuery({
        queryKey: ['pdv-customers'],
        queryFn: async () => {
            try {
                const response = await api.get('/customers', { params: { limit: 50 } });
                const customersData = response.data.customers || response.data || [];
                return Array.isArray(customersData) ? customersData : [];
            } catch (error) {
                console.error('Erro ao buscar clientes:', error);
                return [];
            }
        },
    });

    // Emit NFC-e mutation
    const emitMutation = useMutation({
        mutationFn: async (data: { items: any[]; paymentMethod: string; customerId?: string }) => {
            const response = await api.post('/nfce/emit', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast({
                title: 'NFC-e Emitida!',
                description: `Chave: ${data.accessKey?.substring(0, 20)}...`,
            });
            setCart([]);
            setSelectedCustomer(null);
            setShowPaymentModal(false);
            queryClient.invalidateQueries({ queryKey: ['pdv-products'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Erro na Emissão',
                description: error.response?.data?.message || error.message,
                variant: 'destructive',
            });
        },
    });

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal;
    const change = amountReceived ? parseFloat(amountReceived) - total : 0;

    // Add product to cart
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    // Handle payment
    const handleFinalizeSale = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrinho vazio', variant: 'destructive' });
            return;
        }
        setShowPaymentModal(true);
        setAmountReceived(total.toFixed(2));
    };

    // Confirm and emit
    const handleConfirmPayment = () => {
        emitMutation.mutate({
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
            })),
            paymentMethod,
            customerId: selectedCustomer?.id,
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                handleFinalizeSale();
            }
            if (e.key === 'Escape') {
                setShowPaymentModal(false);
                setShowCustomerModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]);

    const paymentMethods = [
        { value: '01', label: 'Dinheiro', icon: Banknote },
        { value: '03', label: 'Cartão Crédito', icon: CreditCard },
        { value: '04', label: 'Cartão Débito', icon: CreditCard },
        { value: '17', label: 'PIX', icon: QrCode },
    ];

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShoppingCart className="h-8 w-8" />
                    <h1 className="text-2xl font-bold">PDV - Ponto de Venda</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        F2: Buscar | F4: Finalizar | ESC: Cancelar
                    </Badge>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col p-4 border-r">
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Buscar produto por nome, SKU ou código de barras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-14 text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Product Results */}
                    {loadingProducts && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}

                    {products.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto">
                            {products.map((product: Product) => (
                                <Card
                                    key={product.id}
                                    className="cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => addToCart(product)}
                                >
                                    <CardContent className="p-4">
                                        <p className="font-semibold truncate">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                                        <p className="text-xl font-bold text-primary mt-2">
                                            R$ {product.price.toFixed(2)}
                                        </p>
                                        <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="mt-1">
                                            Estoque: {product.stock}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {searchTerm.length >= 2 && products.length === 0 && !loadingProducts && (
                        <p className="text-center text-muted-foreground py-8">
                            Nenhum produto encontrado
                        </p>
                    )}
                </div>

                {/* Right Panel - Cart */}
                <div className="w-[400px] flex flex-col bg-muted/30">
                    {/* Customer */}
                    <div className="p-4 border-b">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => setShowCustomerModal(true)}
                        >
                            <User className="h-4 w-4" />
                            {selectedCustomer ? selectedCustomer.name : 'Consumidor Final'}
                        </Button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                Carrinho vazio
                            </p>
                        ) : (
                            cart.map((item) => (
                                <Card key={item.product.id} className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{item.product.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                R$ {item.product.price.toFixed(2)} x {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8"
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8"
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="h-8 w-8 ml-1"
                                                onClick={() => removeFromCart(item.product.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-right font-bold text-primary mt-1">
                                        R$ {(item.product.price * item.quantity).toFixed(2)}
                                    </p>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Totals */}
                    <div className="p-4 border-t bg-background">
                        <div className="flex justify-between text-lg mb-2">
                            <span>Subtotal:</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold text-primary mb-4">
                            <span>TOTAL:</span>
                            <span>R$ {total.toFixed(2)}</span>
                        </div>
                        <Button
                            className="w-full h-14 text-lg gap-2"
                            onClick={handleFinalizeSale}
                            disabled={cart.length === 0}
                        >
                            <Receipt className="h-6 w-6" />
                            Finalizar Venda (F4)
                        </Button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Pagamento</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="text-center">
                            <p className="text-muted-foreground">Total a Pagar</p>
                            <p className="text-4xl font-bold text-primary">R$ {total.toFixed(2)}</p>
                        </div>

                        <div className="space-y-3">
                            <Label>Forma de Pagamento</Label>
                            <RadioGroup
                                value={paymentMethod}
                                onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                                className="grid grid-cols-2 gap-2"
                            >
                                {paymentMethods.map(method => (
                                    <div key={method.value}>
                                        <RadioGroupItem
                                            value={method.value}
                                            id={method.value}
                                            className="peer sr-only"
                                        />
                                        <Label
                                            htmlFor={method.value}
                                            className="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                        >
                                            <method.icon className="h-5 w-5" />
                                            {method.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {paymentMethod === '01' && (
                            <div className="space-y-2">
                                <Label>Valor Recebido</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    className="text-xl text-right"
                                />
                                {change > 0 && (
                                    <div className="text-right">
                                        <span className="text-muted-foreground">Troco: </span>
                                        <span className="text-xl font-bold text-green-600">
                                            R$ {change.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmPayment}
                            disabled={emitMutation.isPending}
                            className="gap-2"
                        >
                            {emitMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="h-4 w-4" />
                            )}
                            Confirmar e Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Customer Selection Modal */}
            <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecionar Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                                setSelectedCustomer(null);
                                setShowCustomerModal(false);
                            }}
                        >
                            <User className="h-4 w-4 mr-2" />
                            Consumidor Final (Sem CPF)
                        </Button>
                        {customers.map((customer: Customer) => (
                            <Button
                                key={customer.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                    setSelectedCustomer(customer);
                                    setShowCustomerModal(false);
                                }}
                            >
                                <User className="h-4 w-4 mr-2" />
                                {customer.name}
                                {customer.cpf && <span className="ml-2 text-muted-foreground">({customer.cpf})</span>}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PDV;
