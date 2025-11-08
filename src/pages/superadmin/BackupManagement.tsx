import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { DatabaseBackup, Play, History, CheckCircle, Clock, AlertTriangle, Building } from 'lucide-react';
import BackupHistoryModal from '@/components/superadmin/modals/BackupHistoryModal';
import StartBackupConfirmationModal from '@/components/superadmin/modals/StartBackupConfirmationModal';
import { toast } from 'sonner';

export default function BackupManagement() {
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTenantName, setConfirmTenantName] = useState<string | undefined>(undefined);

  const tenants = [
    { id: 'TEN-001', name: 'Farmácia Central LTDA', lastBackup: '2024-11-08 02:00', status: 'completed' },
    { id: 'TEN-002', name: 'Drogaria Pacheco S/A', lastBackup: '2024-11-08 02:00', status: 'completed' },
    { id: 'TEN-003', name: 'Farma Conde', lastBackup: '2024-11-07 02:00', status: 'failed' },
    { id: 'TEN-004', name: 'Ultrafarma', lastBackup: '2024-11-08 02:00', status: 'in_progress' },
  ];

  const handleViewHistory = (tenant: any) => {
    setSelectedTenant(tenant);
    setIsHistoryOpen(true);
  };

  const handleStartBackup = (tenant?: any) => {
    setConfirmTenantName(tenant?.name);
    setIsConfirmOpen(true);
  };

  const onConfirmBackup = () => {
    const message = confirmTenantName
      ? `Backup para ${confirmTenantName} iniciado.`
      : "Backup geral do sistema iniciado.";
    toast.info(message);
    setIsConfirmOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Concluído</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1 animate-spin"/> Em Progresso</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/> Falhou</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Backups</h1>
        <p className="text-muted-foreground mt-1">Crie e monitore os backups do sistema e dos tenants.</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-6 w-6 text-primary" />Backup Geral do Sistema</CardTitle>
          <CardDescription>Backup da base de dados principal do superadmin e configurações globais.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Último backup</p>
            <p className="font-semibold">08 de Novembro de 2024, 03:00</p>
            <div className="mt-1">{getStatusBadge('completed')}</div>
          </div>
          <Button onClick={() => handleStartBackup()}><Play className="h-4 w-4 mr-2" />Criar Novo Backup Geral</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backups por Tenant</CardTitle>
          <CardDescription>Gerencie os backups individuais de cada empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Último Backup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-muted p-2 rounded-lg"><Building className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.lastBackup}</TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewHistory(tenant)}>
                        <History className="h-4 w-4 mr-2" />
                        Histórico
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleStartBackup(tenant)}>
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar Backup
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <BackupHistoryModal tenant={selectedTenant} />
      </Dialog>
      <StartBackupConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={onConfirmBackup}
        tenantName={confirmTenantName}
      />
    </>
  );
}
