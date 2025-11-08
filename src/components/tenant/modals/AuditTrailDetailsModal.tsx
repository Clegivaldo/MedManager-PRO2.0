import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Calendar, Edit } from 'lucide-react';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  timestamp: string;
  details: {
    from?: Record<string, any>;
    to?: Record<string, any>;
  };
}

interface AuditTrailDetailsModalProps {
  log: AuditLog | null;
}

const formatJson = (data: Record<string, any> | undefined) => {
    if (!data) return '{}';
    return JSON.stringify(data, null, 2);
}

export default function AuditTrailDetailsModal({ log }: AuditTrailDetailsModalProps) {
  if (!log) return null;

  const hasChanges = log.details.from || log.details.to;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Detalhes da Atividade</DialogTitle>
        <DialogDescription>
          Registro de auditoria <span className="font-mono">{log.id}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
            <InfoItem icon={User} label="Usuário" value={log.user} />
            <InfoItem icon={Calendar} label="Data/Hora" value={log.timestamp} />
            <InfoItem icon={Edit} label="Entidade Afetada" value={log.entity} />
        </div>
        
        {hasChanges && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold mb-2">Dados Antigos</h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs">{formatJson(log.details.from)}</pre>
                    </ScrollArea>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Dados Novos</h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs">{formatJson(log.details.to)}</pre>
                    </ScrollArea>
                </div>
            </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click()}>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <p className="font-semibold">{value}</p>
    </div>
)
