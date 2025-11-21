import { useEffect, useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import superadminService from '@/services/superadmin.service';

interface Tenant {
  id: string;
  name: string;
}

interface BackupHistoryModalProps {
  tenant: Tenant | null;
}

export default function BackupHistoryModal({ tenant }: BackupHistoryModalProps) {
  if (!tenant) return null;

  const [rows, setRows] = useState<Array<{ id: string; date: string; status: string; size?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const logs = await superadminService.getAuditLogs({ tenantId: tenant.id, limit: 10, page: 1 });
        const mapped = logs.logs.map((l: any, idx: number) => ({
          id: l.id || `LOG-${idx}`,
          date: new Date(l.createdAt).toLocaleString('pt-BR'),
          status: 'completed',
          size: '-'
        }));
        setRows(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenant?.id]);

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
            {rows.map(backup => (
              <TableRow key={backup.id}>
                <TableCell className="font-mono">{backup.id}</TableCell>
                <TableCell>{backup.date}</TableCell>
                <TableCell>{backup.size}</TableCell>
                <TableCell>{getStatusBadge(backup.status)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">Sem histórico</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}
