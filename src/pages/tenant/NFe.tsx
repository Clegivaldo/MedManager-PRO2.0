import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Plus,
  Search,
  Download,
  XCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import CancelNFeModal from '@/components/tenant/modals/CancelNFeModal';

export default function NFe() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNFe, setSelectedNFe] = useState<any>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const nfeList = [
    { id: 'NFe-001234', client: 'Drogaria São Paulo', date: '2024-11-07', value: 12450.00, status: 'authorized' },
    { id: 'NFe-001233', client: 'Farmácia Popular', date: '2024-11-06', value: 8750.00, status: 'authorized' },
    { id: 'NFe-001232', client: 'Rede Bem Estar', date: '2024-11-05', value: 25300.00, status: 'canceled' },
    { id: 'NFe-001231', client: 'Farmácia Central', date: '2024-11-04', value: 3200.00, status: 'processing' },
  ];

  const handleCancel = (nfe: any) => {
    setSelectedNFe(nfe);
    setIsCancelOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1"/>Processando</Badge>;
      case 'authorized': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/>Autorizada</Badge>;
      case 'canceled': return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1"/>Cancelada</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredNFe = nfeList.filter(nfe =>
    nfe.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nfe.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notas Fiscais (NFe)</h1>
          <p className="text-gray-600 mt-1">Emita e gerencie suas notas fiscais eletrônicas</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Emitir NFe Avulsa
        </Button>
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
                <TableHead>NFe</TableHead>
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
                  <TableCell className="font-mono">{nfe.id}</TableCell>
                  <TableCell className="font-medium">{nfe.client}</TableCell>
                  <TableCell>{nfe.date}</TableCell>
                  <TableCell className="font-medium">R$ {nfe.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{getStatusBadge(nfe.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={nfe.status !== 'authorized'} onClick={() => handleCancel(nfe)}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CancelNFeModal nfe={selectedNFe} open={isCancelOpen} onOpenChange={setIsCancelOpen} />
    </>
  );
}
