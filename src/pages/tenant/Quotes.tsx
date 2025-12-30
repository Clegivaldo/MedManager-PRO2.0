import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Eye,
  Check,
  X,
  Clock,
  ShoppingCart
} from 'lucide-react';
import NewQuoteModal from '@/components/tenant/modals/NewQuoteModal';
import QuoteDetailsModal from '@/components/tenant/modals/QuoteDetailsModal';
import EditQuoteModal from '@/components/tenant/modals/EditQuoteModal';
import quoteService, { Quote } from '@/services/quote.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyState from '@/components/EmptyState';

export default function Quotes() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await quoteService.list({
        page,
        limit: 50,
        search: searchTerm || undefined,
      });
      setQuotes(response.data?.quotes || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os orçamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ CORREÇÃO: Só carregar dados após autenticação estar completa
    if (!authLoading && isAuthenticated) {
      loadQuotes();
    }
  }, [page, searchTerm, authLoading, isAuthenticated]);

  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDetailsOpen(true);
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsEditOpen(true);
  };

  const handleQuoteSuccess = () => {
    loadQuotes();
    setIsNewOpen(false);
    setIsEditOpen(false);
  };

  const handleConvertToSale = async (quote: Quote) => {
    if (quote.status !== 'approved') {
      toast({
        title: 'Atenção',
        description: 'Apenas orçamentos aprovados podem ser convertidos em pedido.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await quoteService.approve(quote.id);
      
      toast({
        title: 'Sucesso',
        description: `Pedido ${response.data?.orderNumber || ''} criado com sucesso!`,
      });

      // Recarregar a lista de orçamentos
      loadQuotes();
      
      // Redirecionar para a página de pedidos após 1.5 segundos
      setTimeout(() => {
        window.location.href = '/tenant/orders';
      }, 1500);
    } catch (error: any) {
      console.error('Error converting quote to order:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível converter o orçamento em pedido.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-800"><Eye className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie propostas comerciais para seus clientes</p>
        </div>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <NewQuoteModal onSuccess={handleQuoteSuccess} />
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista de Orçamentos</CardTitle>
              <CardDescription>{total} orçamentos encontrados</CardDescription>
            </div>
            <div className="w-full max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar por nº do orçamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={7} />
          ) : quotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono">{quote.quoteNumber}</TableCell>
                    <TableCell className="font-medium">{quote.customer?.companyName || quote.customer?.tradeName}</TableCell>
                    <TableCell>{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{new Date(quote.validUntil).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">R$ {(quote.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewDetails(quote)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar detalhes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(quote)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar orçamento</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleConvertToSale(quote)}
                                disabled={quote.status !== 'approved'}
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {quote.status === 'approved' ? 'Converter em pedido' : 'Orçamento precisa estar aprovado'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Imprimir orçamento</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Nenhum orçamento encontrado"
              description="Não há orçamentos cadastrados no sistema."
              action={<Button>Criar Primeiro Orçamento</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <QuoteDetailsModal quote={selectedQuote} />
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditQuoteModal quote={selectedQuote} onSuccess={handleQuoteSuccess} />
      </Dialog>
    </>
  );
}
