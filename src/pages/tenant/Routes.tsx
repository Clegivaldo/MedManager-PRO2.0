import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Truck,
  Plus,
  Map,
  User,
  Clock,
  Check,
  Route as RouteIcon,
  Bot
} from 'lucide-react';

export default function RoutesPage() {
  const routes = [
    {
      id: 'ROTA-001',
      driver: 'João Santos',
      vehicle: 'ABC-1234',
      date: '2024-11-08',
      stops: 12,
      progress: 25,
      status: 'in_transit',
    },
    {
      id: 'ROTA-002',
      driver: 'Maria Silva',
      vehicle: 'DEF-5678',
      date: '2024-11-08',
      stops: 8,
      progress: 0,
      status: 'planning',
    },
    {
      id: 'ROTA-003',
      driver: 'Pedro Costa',
      vehicle: 'GHI-9012',
      date: '2024-11-07',
      stops: 15,
      progress: 100,
      status: 'completed',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1"/>Planejamento</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-100 text-blue-800"><Truck className="h-3 w-3 mr-1"/>Em Trânsito</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1"/>Concluída</Badge>;
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
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Rota
            </Button>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-mono">{route.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500"/>
                            <span>{route.driver}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(route.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
