import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Copy, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import tenantBillingService, { Invoice, PaymentInfo } from '@/services/tenant-billing.service';
import { useToast } from '@/hooks/use-toast';

export default function MyInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalPending: 0, totalPaid: 0 });
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [copiedPix, setCopiedPix] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const response = await tenantBillingService.listInvoices({ limit: 50 });
            setInvoices(response.invoices);
            setSummary(response.summary);
        } catch (error) {
            console.error('Error loading invoices:', error);
            toast({
                title: 'Erro ao carregar faturas',
                description: 'Não foi possível carregar suas faturas. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePayClick = async (invoice: Invoice) => {
        if (invoice.status === 'confirmed') {
            toast({
                title: 'Fatura já paga',
                description: 'Esta fatura já foi paga.',
            });
            return;
        }

        try {
            setSelectedInvoice(invoice);
            setLoadingPayment(true);
            setIsPaymentModalOpen(true);

            const response = await tenantBillingService.getPaymentInfo(invoice.id);
            setPaymentInfo(response.paymentInfo);
        } catch (error) {
            console.error('Error loading payment info:', error);
            toast({
                title: 'Erro ao carregar informações de pagamento',
                description: 'Não foi possível carregar as informações. Tente novamente.',
                variant: 'destructive',
            });
            setIsPaymentModalOpen(false);
        } finally {
            setLoadingPayment(false);
        }
    };

    const handleCopyPixCode = () => {
        if (paymentInfo?.pixQrCode) {
            navigator.clipboard.writeText(paymentInfo.pixQrCode);
            setCopiedPix(true);
            toast({
                title: 'Código Pix copiado!',
                description: 'Cole no seu aplicativo bancário para efetuar o pagamento.',
            });
            setTimeout(() => setCopiedPix(false), 3000);
        }
    };

    const handleDownloadBoleto = () => {
        if (paymentInfo?.boletoUrl) {
            window.open(paymentInfo.boletoUrl, '_blank');
        }
    };

    const getStatusBadge = (invoice: Invoice) => {
        const { label, color, bgColor } = tenantBillingService.getStatusBadge(invoice.status);
        return (
            <Badge className={`${bgColor} ${color}`}>
                {label}
            </Badge>
        );
    };

    const isOverdue = (invoice: Invoice) => {
        return tenantBillingService.isOverdue(invoice.dueDate, invoice.status);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold">Minhas Faturas</h1>
                <p className="text-muted-foreground mt-1">
                    Acompanhe suas faturas e realize pagamentos
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturas Pendentes</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalPending}</div>
                        <p className="text-xs text-muted-foreground">
                            Faturas aguardando pagamento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturas Pagas</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalPaid}</div>
                        <p className="text-xs text-muted-foreground">
                            Faturas quitadas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Faturas</CardTitle>
                    <CardDescription>
                        Todas as suas faturas e cobranças
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            Nenhuma fatura encontrada
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">
                                            {invoice.description}
                                            {isOverdue(invoice) && (
                                                <Badge variant="destructive" className="ml-2">Vencida</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tenantBillingService.formatCurrency(invoice.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {tenantBillingService.formatDate(invoice.dueDate)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(invoice)}</TableCell>
                                        <TableCell className="uppercase">{invoice.paymentMethod}</TableCell>
                                        <TableCell className="text-right">
                                            {invoice.status !== 'confirmed' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePayClick(invoice)}
                                                    disabled={invoice.status === 'cancelled'}
                                                >
                                                    <CreditCard className="h-4 w-4 mr-2" />
                                                    Pagar
                                                </Button>
                                            )}
                                            {invoice.status === 'confirmed' && (
                                                <span className="text-xs text-green-600">
                                                    Pago em {invoice.paidAt && tenantBillingService.formatDate(invoice.paidAt)}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Pagar Fatura</DialogTitle>
                        <DialogDescription>
                            {selectedInvoice && (
                                <>
                                    Fatura: {selectedInvoice.description} - {' '}
                                    {tenantBillingService.formatCurrency(selectedInvoice.amount)}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingPayment ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : paymentInfo ? (
                        <Tabs defaultValue={paymentInfo.paymentMethod === 'pix' ? 'pix' : 'boleto'} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="pix">PIX</TabsTrigger>
                                <TabsTrigger value="boleto">Boleto</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pix" className="space-y-4">
                                {paymentInfo.pixQrCode ? (
                                    <>
                                        <Alert>
                                            <AlertDescription>
                                                Escaneie o QR Code abaixo ou copie o código Pix para pagar
                                            </AlertDescription>
                                        </Alert>

                                        {paymentInfo.pixQrCodeBase64 && (
                                            <div className="flex justify-center p-4 bg-white rounded">
                                                <img
                                                    src={`data:image/png;base64,${paymentInfo.pixQrCodeBase64}`}
                                                    alt="QR Code Pix"
                                                    className="w-64 h-64"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Código Pix Copia e Cola</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={paymentInfo.pixQrCode}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 border rounded text-sm font-mono"
                                                />
                                                <Button onClick={handleCopyPixCode} variant="outline">
                                                    {copiedPix ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <Alert>
                                            <AlertDescription className="text-xs">
                                                Após realizar o pagamento, o status será atualizado automaticamente em até 2 minutos.
                                            </AlertDescription>
                                        </Alert>
                                    </>
                                ) : (
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            QR Code Pix não disponível para esta fatura
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </TabsContent>

                            <TabsContent value="boleto" className="space-y-4">
                                {paymentInfo.boletoUrl ? (
                                    <>
                                        <Alert>
                                            <AlertDescription>
                                                Baixe o boleto para pagar em qualquer banco ou casa lotérica
                                            </AlertDescription>
                                        </Alert>

                                        {paymentInfo.boletoBarcode && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Código de Barras</label>
                                                <input
                                                    type="text"
                                                    value={paymentInfo.boletoBarcode}
                                                    readOnly
                                                    className="w-full px-3 py-2 border rounded text-sm font-mono"
                                                />
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleDownloadBoleto}
                                            className="w-full"
                                            size="lg"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Baixar Boleto
                                        </Button>

                                        <Alert>
                                            <AlertDescription className="text-xs">
                                                O boleto pode levar até 3 dias úteis para compensar após o pagamento.
                                            </AlertDescription>
                                        </Alert>
                                    </>
                                ) : (
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            Boleto não disponível para esta fatura
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Não foi possível carregar as informações de pagamento
                            </AlertDescription>
                        </Alert>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
