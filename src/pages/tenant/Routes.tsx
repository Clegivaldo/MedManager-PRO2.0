import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  Truck,
  Plus,
  Map,
  User,
  Clock,
  Check,
  Eye,
  Bot
} from 'lucide-react';
import NewRouteModal from '@/components/tenant/modals/NewRouteModal';
import RouteDetailsModal from '@/components/tenant/modals/RouteDetailsModal';
import deliveryRouteService, { DeliveryRoute } from '@/services/delivery-route.service';
import { useToast } from '@/hooks/use-toast';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyState from '@/components/EmptyState';

export default function RoutesPage() {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await deliveryRouteService.list({
        page,
        limit: 50,
      });
      setRoutes(response.routes || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading routes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as rotas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [page]);

  const handleViewDetails = (route: DeliveryRoute) => {
    setSelectedRoute(route);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Planejamento</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-100 text-blue-800"><Truck className="h-3 w-3 mr-1" />Em Trânsito</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Concluída</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rotas e Entregas</h1>
          <p className="text-gray-600 mt-1">Planeje, otimize e acompanhe suas rotas de entrega</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Otimizar Rotas
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Rota
              </Button>
            </DialogTrigger>
            <NewRouteModal />
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle>Mapa de Entregas</CardTitle>
              <CardDescription>Visualização em tempo real das rotas ativas</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-100 rounded-b-lg">
              <div className="text-center text-gray-500">
                <Map className="h-16 w-16 mx-auto mb-4" />
                <p>Integração com mapa em desenvolvimento.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle>Rotas Ativas</CardTitle>
              <CardDescription>Acompanhamento das entregas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton columns={4} />
              ) : routes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rota</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell className="font-mono">{route.routeNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>{route.driverName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(route.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(route)}><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Truck}
                  title="Nenhuma rota encontrada"
                  description="Não há rotas cadastradas."
                  action={<Button>Criar Primeira Rota</Button>}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <RouteDetailsModal route={selectedRoute} />
      </Dialog>
    </>
  );
}
