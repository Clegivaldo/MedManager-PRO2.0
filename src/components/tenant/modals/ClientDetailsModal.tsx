import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Customer } from '@/services/customer.service';

interface ClientDetailsModalProps {
  client: Customer | null;
}

const recentOrders = [
  { id: '#PED-2024-001', date: '2024-11-07', value: 12450.00 },
  { id: '#PED-2024-000', date: '2024-10-25', value: 7300.50 },
  { id: '#PED-2023-987', date: '2024-10-11', value: 15200.00 },
];

export default function ClientDetailsModal({ client }: ClientDetailsModalProps) {
  if (!client) return null;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          {client.companyName}
        </DialogTitle>
        <DialogDescription>Detalhes do cliente e histórico de relacionamento.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
          <InfoItem icon={FileText} label="CNPJ/CPF" value={client.cnpjCpf} />
          <InfoItem icon={Mail} label="Email de Contato" value={client.email || '-'} />
        </div>
        <div className="space-y-4">
          <InfoItem icon={Phone} label="Telefone" value={client.phone || '-'} />
          <InfoItem
            icon={MapPin}
            label="Localização"
            value={client.address && typeof client.address === 'object' && 'city' in client.address && 'state' in client.address
              // @ts-ignore
              ? `${client.address.city}, ${client.address.state}`
              : '-'}
          />
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Histórico de Pedidos</h3>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.id}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="text-right font-medium">R$ {order.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
  <div>
    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><Icon className="h-4 w-4" />{label}</Label>
    <p className="font-semibold">{value}</p>
  </div>
)
