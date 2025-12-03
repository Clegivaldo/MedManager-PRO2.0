import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  Search,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  FileText,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listCharges, syncChargeStatus, importChargesFromAsaas, syncAllCharges, cancelCharge } from '@/services/superadmin-payments.service';

interface Charge {
  id: string;
  chargeId: string;
  tenantId: string;
  tenantName?: string;
  amount: string;
  currency: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
  gateway: string;
  gatewayChargeId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  dueDate: string;
  paidAt?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedCharges {
  charges: Charge[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// Atualizado: sincronização completa com Asaas
export default function ChargesManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [syncingChargeId, setSyncingChargeId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listCharges({
        page: Number(page),
        limit: Number(limit),
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        method: methodFilter !== 'all' ? methodFilter : undefined
      });
      setCharges(data.charges);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao carregar cobranças',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit, searchTerm, statusFilter, methodFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">✓ Confirmada</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">✗ Cancelada</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">⏰ Expirada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'pix':
        return '📱';
      case 'boleto':
        return '📄';
      case 'credit_card':
        return '💳';
      default:
        return '💰';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para área de transferência' });
  };

  const openBoleto = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSync = async (chargeId: string) => {
    try {
      setSyncingChargeId(chargeId);
      const result = await syncChargeStatus(chargeId);

      toast({
        title: 'Sincronização concluída',
        description: result.message,
        variant: 'default'
      });

      // Recarregar a lista
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao sincronizar',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingChargeId(null);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const result = await importChargesFromAsaas();

      toast({
        title: 'Importação concluída',
        description: result.message,
        variant: 'default'
      });

      // Recarregar a lista
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao importar',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setImporting(true);
      const result = await syncAllCharges();

      toast({
        title: 'Sincronização completa concluída',
        description: result.message,
        variant: 'default'
      });

      // Recarregar a lista
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao sincronizar',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = async (charge: Charge) => {
    if (!confirm(`Tem certeza que deseja cancelar a cobrança de ${formatCurrency(charge.amount)}?`)) {
      return;
    }

    try {
      setSyncingChargeId(charge.chargeId);
      const result = await cancelCharge(charge.chargeId);

      toast({
        title: 'Cobrança cancelada',
        description: result.message,
        variant: 'default'
      });

      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao cancelar',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingChargeId(null);
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Cobranças
          </h1>
          <p className="text-muted-foreground">Gerencie todas as cobranças criadas para os tenants</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleSyncAll}
                disabled={importing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Sincronizando...' : 'Sincronizar Todas'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Importando...' : 'Importar do Asaas'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Buscar por Tenant/ID</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome ou ID da cobrança"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={load}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Método</label>
                <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="credit_card">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Itens por página</label>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobranças</CardTitle>
            <CardDescription>
              Total de {total} cobranças • Página {page} de {pages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando cobranças...</p>
              </div>
            ) : charges.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma cobrança encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{charge.tenantName || 'N/A'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{charge.chargeId}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(charge.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getMethodIcon(charge.paymentMethod)}</span>
                            <span className="capitalize">{charge.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(charge.status)}</TableCell>
                        <TableCell>{new Date(charge.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(charge.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {charge.paymentMethod === 'pix' && charge.pixQrCodeBase64 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCharge(charge);
                                  setShowQrModal(true);
                                }}
                                title="Ver QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            )}
                            {charge.paymentMethod === 'boleto' && charge.boletoUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openBoleto(charge.boletoUrl!)}
                                title="Abrir PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {charge.paymentMethod === 'pix' && charge.pixQrCode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(charge.pixQrCode!)}
                                title="Copiar PIX"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {charge.boletoBarcode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(charge.boletoBarcode!)}
                                title="Copiar código"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSync(charge.chargeId)}
                              disabled={syncingChargeId === charge.chargeId}
                              title="Sincronizar status com Asaas"
                            >
                              <RefreshCw className={`h-4 w-4 ${syncingChargeId === charge.chargeId ? 'animate-spin' : ''}`} />
                            </Button>
                            {charge.status !== 'confirmed' && charge.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(charge)}
                                disabled={syncingChargeId === charge.chargeId}
                                title="Cancelar cobrança"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && charges.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de QR Code */}
      {showQrModal && selectedCharge && selectedCharge.pixQrCodeBase64 && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQrModal(false)}
        >
          <Card className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code PIX
              </CardTitle>
              <CardDescription>
                Cobrança de {formatCurrency(selectedCharge.amount)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded border">
                <img
                  src={`data:image/png;base64,${selectedCharge.pixQrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-full"
                />
              </div>
              {selectedCharge.pixQrCode && (
                <>
                  <div>
                    <label className="text-sm font-medium">Código PIX (Copiar e Colar)</label>
                    <div className="flex gap-2 mt-2">
                      <code className="flex-1 p-3 bg-muted rounded text-xs break-all font-mono">
                        {selectedCharge.pixQrCode}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(selectedCharge.pixQrCode!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowQrModal(false)}
              >
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
