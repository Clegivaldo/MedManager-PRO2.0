import { useState } from 'react';
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
  Edit,
  Eye,
  Check,
  X,
  Clock
} from 'lucide-react';
import NewQuoteModal from '@/components/tenant/modals/NewQuoteModal';
import QuoteDetailsModal from '@/components/tenant/modals/QuoteDetailsModal';
import EditQuoteModal from '@/components/tenant/modals/EditQuoteModal';

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const quotes = [
    { id: '#ORC-2024-051', client: 'Drogaria Pacheco', date: '2024-11-08', validity: '2024-11-15', total: 5230.00, status: 'sent' },
    { id: '#ORC-2024-050', client: 'Drogaria São Paulo', date: '2024-11-07', validity: '2024-11-14', total: 12450.00, status: 'approved' },
    { id: '#ORC-2024-049', client: 'Farmácia Popular', date: '2024-11-06', validity: '2024-11-13', total: 8750.00, status: 'pending' },
    { id: '#ORC-2024-048', client: 'Rede Bem Estar', date: '2024-11-05', validity: '2024-11-12', total: 25300.00, status: 'rejected' },
  ];
  
  const handleViewDetails = (quote: any) => {
    setSelectedQuote(quote);
    setIsDetailsOpen(true);
  };

  const handleEdit = (quote: any) => {
    setSelectedQuote(quote);
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1"/>Pendente</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-800"><Eye className="h-3 w-3 mr-1"/>Enviado</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1"/>Aprovado</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1"/>Rejeitado</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie propostas comerciais para seus clientes</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <NewQuoteModal />
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Lista de Orçamentos</CardTitle>
                <CardDescription>{filteredQuotes.length} orçamentos encontrados</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar por nº do orçamento ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono">{quote.id}</TableCell>
                  <TableCell className="font-medium">{quote.client}</TableCell>
                  <TableCell>{quote.date}</TableCell>
                  <TableCell>{quote.validity}</TableCell>
                  <TableCell className="font-medium">R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{getStatusBadge(quote.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(quote)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(quote)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <QuoteDetailsModal quote={selectedQuote} />
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditQuoteModal quote={selectedQuote} />
      </Dialog>
    </>
  );
}
