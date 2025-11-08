import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
}

interface BackupHistoryModalProps {
  tenant: Tenant | null;
}

const backupHistory = [
    { id: 'BKP-005', date: '2024-11-08 02:00', status: 'completed', size: '1.2 GB' },
    { id: 'BKP-004', date: '2024-11-07 02:00', status: 'failed', size: 'N/A' },
    { id: 'BKP-003', date: '2024-11-06 02:00', status: 'completed', size: '1.1 GB' },
];

export default function BackupHistoryModal({ tenant }: BackupHistoryModalProps) {
  if (!tenant) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Concluído</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/> Falhou</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Histórico de Backups</DialogTitle>
        <DialogDescription>
          Visualizando histórico para o tenant <span className="font-bold text-primary">{tenant.name}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do Backup</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backupHistory.map(backup => (
              <TableRow key={backup.id}>
                <TableCell className="font-mono">{backup.id}</TableCell>
                <TableCell>{backup.date}</TableCell>
                <TableCell>{backup.size}</TableCell>
                <TableCell>{getStatusBadge(backup.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}
