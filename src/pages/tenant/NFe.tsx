import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Download, X, Search, Filter, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, Loader2, Edit2
} from 'lucide-react';
import { CorrectionModal } from './CorrectionModal';
import { useToast } from '@/hooks/use-toast';
import invoiceService from '@/services/invoice.service';
import { getErrorMessage } from '@/services/api';

interface Invoice {
  id: string;
  number: number;
  series: number;
  accessKey?: string | null;
  protocol?: string | null; // Used for auth protocol or rejection reason
  issueDate: string;
  totalValue: string | number; // Updated to handle backend string response
  status: string;
  customer?: {
    companyName: string;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  ISSUED: { label: 'Emitida', color: 'bg-blue-100 text-blue-800' },
  AUTHORIZED: { label: 'Autorizada', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  DENIED: { label: 'Denegada', color: 'bg-orange-100 text-orange-800' },
  IN_CONTINGENCY: { label: 'Contingência', color: 'bg-yellow-100 text-yellow-800' },
};

export default function NFe() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [page, statusFilter, searchTerm, startDate, endDate]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.list({
        page,
        limit: 15,
        search: searchTerm || undefined,
        status: statusFilter as any || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setInvoices(response.invoices);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast({
        title: 'Erro ao carregar notas fiscais',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDANFE = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId);
      await invoiceService.downloadDanfe(invoiceId);

      toast({
        title: 'Download iniciado',
        description: 'O DANFE está sendo baixado',
      });
    } catch (error) {
      toast({
        title: 'Erro ao baixar DANFE',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadXML = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId);
      await invoiceService.downloadXml(invoiceId);

      toast({
        title: 'Download iniciado',
        description: 'O XML está sendo baixado',
      });
    } catch (error) {
      toast({
        title: 'Erro ao baixar XML',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta nota fiscal?')) {
      return;
    }

    try {
      setCancellingId(invoiceId);
      await invoiceService.cancel(invoiceId, 'Solicitado pelo usuário'); // Using generic justification for now as modal assumes simple cancel

      toast({
        title: 'Nota fiscal cancelada',
        description: 'A NFe foi cancelada com sucesso',
      });

      loadInvoices();
    } catch (error) {
      toast({
        title: 'Erro ao cancelar nota',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notas Fiscais Eletrônicas</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas NFe emitidas e autorizadas</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>NFe Emitidas</CardTitle>
              <CardDescription>{total} notas fiscais encontradas</CardDescription>
            </div>
            <Button onClick={loadInvoices} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              // Use a non-empty value for the "Todos os Status" option
              setStatusFilter(value === 'ALL' ? '' : value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                placeholder="Data inicial"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                placeholder="Data final"
              />
            </div>
          </div>

          {(searchTerm || statusFilter || startDate || endDate) && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma nota fiscal encontrada</p>
                    {(searchTerm || statusFilter || startDate || endDate) && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Limpar filtros
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">
                      {invoice.number.toString().padStart(6, '0')}/{invoice.series}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.customer?.companyName || 'N/A'}</p>
                        {invoice.accessKey && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {invoice.accessKey.substring(0, 20)}...
                          </p>
                        )}
                        {invoice.status === 'DENIED' && invoice.protocol && (
                          <p className="text-xs text-red-600 font-medium mt-1">
                            Erro: {invoice.protocol}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(invoice.totalValue))}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDANFE(invoice.id)}
                          disabled={downloadingId === invoice.id}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              DANFE
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadXML(invoice.id)}
                          disabled={downloadingId === invoice.id}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              XML
                            </>
                          )}
                        </Button>
                        {invoice.status === 'AUTHORIZED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvoice(invoice.id)}
                            disabled={cancellingId === invoice.id}
                          >
                            {cancellingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        )}
                        {invoice.status === 'AUTHORIZED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Carta de Correção"
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id);
                              setIsCorrectionModalOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * 15) + 1} a {Math.min(page * 15, total)} de {total} notas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceId && (
        <CorrectionModal
          isOpen={isCorrectionModalOpen}
          onClose={() => {
            setIsCorrectionModalOpen(false);
            setSelectedInvoiceId(null);
          }}
          invoiceId={selectedInvoiceId}
          onSuccess={loadInvoices}
        />
      )}
    </>
  );
}
