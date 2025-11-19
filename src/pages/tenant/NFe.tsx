import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Search,
  Download,
  XCircle,
  CheckCircle,
  Clock,
  FileCode
} from 'lucide-react';
import CancelNFeModal from '@/components/tenant/modals/CancelNFeModal';
import NewNFeModal from '@/components/tenant/modals/NewNFeModal';
import invoiceService, { InvoiceListItem } from '@/services/invoice.service';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export default function NFe() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNFe, setSelectedNFe] = useState<{ id: string; client: string } | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const { toast } = useToast();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.list({ page: 1, limit: 20 });
      setInvoices(res.invoices || []);
    } catch (e) {
      toast({ title: 'Falha ao carregar notas', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleCancel = (nfe: any) => {
    setSelectedNFe({ id: nfe.id, client: nfe.customer?.companyName || '-' });
    setIsCancelOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1"/>Rascunho</Badge>;
      case 'AUTHORIZED': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/>Autorizada</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1"/>Cancelada</Badge>;
      case 'DENIED': return <Badge variant="destructive">Negada</Badge>;
      case 'ISSUED': return <Badge>Emitida</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredNFe = useMemo(() =>
    invoices.filter(nfe =>
      nfe.number.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (nfe.customer?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [invoices, searchTerm]
  );

  const handleDownloadDanfe = async (id: string, accessKey?: string | null) => {
    try {
      const blob = await invoiceService.downloadDanfe(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danfe-${accessKey || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'DANFE baixado', description: 'PDF gerado com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao baixar DANFE', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  const handleDownloadXml = async (id: string, accessKey?: string | null) => {
    try {
      const blob = await invoiceService.downloadXml(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NFe-${accessKey || id}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'XML baixado', description: 'Arquivo XML autorizado salvo com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao baixar XML', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notas Fiscais (NFe)</h1>
          <p className="text-gray-600 mt-1">Emita e gerencie suas notas fiscais eletrônicas</p>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Emitir NFe Avulsa
                </Button>
            </DialogTrigger>
            <NewNFeModal onCreated={loadInvoices} />
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Lista de Notas Fiscais</CardTitle>
                <CardDescription>{filteredNFe.length} notas encontradas</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar por nº da NFe ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data de Emissão</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNFe.map((nfe) => (
                <TableRow key={nfe.id}>
                  <TableCell className="font-mono">{nfe.number}</TableCell>
                  <TableCell className="font-medium">{nfe.customer?.companyName || '-'}</TableCell>
                  <TableCell>{new Date(nfe.issueDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium">R$ {Number(nfe.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{getStatusBadge(nfe.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={nfe.status !== 'AUTHORIZED'} 
                        onClick={() => handleDownloadDanfe(nfe.id, nfe.accessKey)}
                        title="Baixar DANFE (PDF)"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={nfe.status !== 'AUTHORIZED'} 
                        onClick={() => handleDownloadXml(nfe.id, nfe.accessKey)}
                        title="Baixar XML Autorizado"
                      >
                        <FileCode className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={nfe.status !== 'AUTHORIZED'} 
                        onClick={() => handleCancel(nfe)}
                        title="Cancelar NF-e"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CancelNFeModal
        nfe={selectedNFe}
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        onConfirm={async (justification) => {
          if (!selectedNFe) return;
          try {
            await invoiceService.cancel(selectedNFe.id, justification);
            toast({ title: 'NF-e cancelada com sucesso' });
            setIsCancelOpen(false);
            setSelectedNFe(null);
            await loadInvoices();
          } catch (e) {
            toast({ title: 'Falha ao cancelar NF-e', description: getErrorMessage(e), variant: 'destructive' });
          }
        }}
      />
    </>
  );
}
