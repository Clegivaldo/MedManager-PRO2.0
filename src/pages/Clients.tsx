import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import ClientDetailsModal from '@/components/tenant/modals/ClientDetailsModal';
import EditClientModal from '@/components/tenant/modals/EditClientModal';

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const clients = [
    { id: 'CLI-001', name: 'Drogaria São Paulo', cnpj: '61.412.110/0001-55', contact: 'compras@dpsp.com.br', phone: '(11) 98765-4321', city: 'São Paulo', state: 'SP', status: 'active', lastOrder: '2024-11-07' },
    { id: 'CLI-002', name: 'Farmácia Popular', cnpj: '05.438.642/0001-20', contact: 'gerencia@farmaciapopular.com', phone: '(21) 91234-5678', city: 'Rio de Janeiro', state: 'RJ', status: 'active', lastOrder: '2024-11-06' },
    { id: 'CLI-003', name: 'Rede Bem Estar', cnpj: '12.345.678/0001-99', contact: 'contato@redebemestar.com', phone: '(31) 95555-8888', city: 'Belo Horizonte', state: 'MG', status: 'inactive', lastOrder: '2024-08-15' },
    { id: 'CLI-004', name: 'Farmácia Central', cnpj: '98.765.432/0001-11', contact: 'financeiro@centralfarma.com', phone: '(41) 94444-7777', city: 'Curitiba', state: 'PR', status: 'active', lastOrder: '2024-11-07' },
  ];

  const handleViewDetails = (client: any) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedClient(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cnpj.includes(searchTerm) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-600 mt-1">Cadastre e gerencie sua carteira de clientes</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>{filteredClients.length} clientes encontrados</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar por nome, CNPJ ou cidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-lg"><Building2 className="h-5 w-5 text-gray-600" /></div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{client.cnpj}</TableCell>
                  <TableCell>
                     <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2"><Mail className="h-3 w-3 text-gray-400"/><span className="text-xs">{client.contact}</span></div>
                        <div className="flex items-center space-x-2"><Phone className="h-3 w-3 text-gray-400"/><span className="text-xs">{client.phone}</span></div>
                     </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2"><MapPin className="h-4 w-4 text-gray-400"/><span>{client.city}, {client.state}</span></div>
                  </TableCell>
                   <TableCell>
                    <Badge variant={client.status === 'active' ? 'secondary' : 'outline'} className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(client)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <ClientDetailsModal client={selectedClient} />
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditClientModal client={selectedClient} mode={editMode} />
      </Dialog>
    </>
  );
}
