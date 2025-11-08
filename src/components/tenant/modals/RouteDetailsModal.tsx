import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Truck, MapPin, CheckCircle, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Route {
  id: string;
  driver: string;
  vehicle: string;
  date: string;
  status: string;
}

interface RouteDetailsModalProps {
  route: Route | null;
}

const routeStops = [
    { client: 'Drogaria Pacheco', address: 'Rua das Flores, 123', status: 'completed' },
    { client: 'Farma & Cia', address: 'Av. Principal, 456', status: 'completed' },
    { client: 'Saúde Total', address: 'Praça Central, 789', status: 'pending' },
    { client: 'Droga Raia', address: 'Rua do Sol, 101', status: 'pending' },
];

export default function RouteDetailsModal({ route }: RouteDetailsModalProps) {
  if (!route) return null;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Detalhes da Rota {route.id}</DialogTitle>
        <DialogDescription>
          Acompanhamento da rota de <span className="font-bold">{route.driver}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoItem icon={User} label="Motorista" value={route.driver} />
            <InfoItem icon={Truck} label="Veículo" value={route.vehicle} />
            <InfoItem icon={Calendar} label="Data" value={route.date} />
        </div>
        <Separator />
        <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="h-5 w-5"/> Paradas da Rota</h3>
            <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-4">
                    {routeStops.map((stop, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            <div>
                                <p className="font-medium">{stop.client}</p>
                                <p className="text-xs text-muted-foreground">{stop.address}</p>
                            </div>
                            {stop.status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Entregue</Badge>
                            ) : (
                                <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1"/> Pendente</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <div className="font-semibold">{value}</div>
    </div>
)
