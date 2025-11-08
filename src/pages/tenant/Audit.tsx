import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Search, Eye, User, Edit, Trash2, PlusCircle } from 'lucide-react';
import AuditTrailDetailsModal from '@/components/tenant/modals/AuditTrailDetailsModal';

export default function Audit() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const auditLogs = [
    { id: 'AUD-001', user: 'Dr. João Silva', action: 'update', entity: 'Pedido #PED-2024-004', timestamp: '2024-11-08 10:30:15', details: { from: { status: 'Pendente' }, to: { status: 'Processando' } } },
    { id: 'AUD-002', user: 'Ana Costa', action: 'create', entity: 'Produto "Ibuprofeno 600mg"', timestamp: '2024-11-08 09:15:42', details: { to: { name: 'Ibuprofeno 600mg', category: 'Analgésico' } } },
    { id: 'AUD-003', user: 'Carlos Santos', action: 'delete', entity: 'Cliente "Farmácia Teste"', timestamp: '2024-11-07 18:05:00', details: { from: { name: 'Farmácia Teste', cnpj: '00.000.000/0000-00' } } },
    { id: 'AUD-004', user: 'Sistema', action: 'system', entity: 'Backup diário concluído', timestamp: '2024-11-08 02:00:00', details: {} },
  ];

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <PlusCircle className="h-4 w-4 text-green-600" />;
      case 'update': return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-600" />;
      default: return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trilhas de Auditoria</h1>
          <p className="text-muted-foreground mt-1">Rastreie todas as atividades importantes realizadas no sistema.</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por entidade ou descrição..." className="pl-10" />
            </div>
            <Select>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por Usuário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                <SelectItem value="user1">Dr. João Silva</SelectItem>
                <SelectItem value="user2">Ana Costa</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-48" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Atividade</CardTitle>
          <CardDescription>{auditLogs.length} registros encontrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{log.user}</div></TableCell>
                  <TableCell><div className="flex items-center gap-2 capitalize">{getActionIcon(log.action)}{log.action}</div></TableCell>
                  <TableCell className="font-medium">{log.entity}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(log)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AuditTrailDetailsModal log={selectedLog} />
      </Dialog>
    </>
  );
}
