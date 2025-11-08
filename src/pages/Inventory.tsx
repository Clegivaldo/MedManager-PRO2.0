import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Calendar,
  BarChart3,
} from 'lucide-react';
import StockMovementModal from '@/components/tenant/modals/StockMovementModal';
import RegisterTemperatureModal from '@/components/tenant/modals/RegisterTemperatureModal';

export default function Inventory() {
  const [activeWarehouse, setActiveWarehouse] = useState('principal');
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);

  const warehouseNames: { [key: string]: string } = {
    principal: 'Armazém Principal',
    fria: 'Câmara Fria',
    controlados: 'Controlados',
  };

  const inventoryItems = [
    { warehouse: 'principal', id: 'INV-001', product: 'Paracetamol 500mg', batch: 'L240801', currentStock: 1250, minStock: 100, maxStock: 2000, location: 'A-01-15', expiry: '2025-08-01', status: 'normal' },
    { warehouse: 'principal', id: 'INV-002', product: 'Amoxicilina 875mg', batch: 'L240802', currentStock: 45, minStock: 50, maxStock: 500, location: 'B-02-08', expiry: '2025-06-15', status: 'low' },
    { warehouse: 'fria', id: 'INV-003', product: 'Insulina NPH', batch: 'L240803', currentStock: 89, minStock: 20, maxStock: 200, location: 'C-01-05', expiry: '2024-12-30', status: 'expiring' },
    { warehouse: 'controlados', id: 'INV-004', product: 'Morfina 10mg', batch: 'L240805', currentStock: 30, minStock: 10, maxStock: 100, location: 'S-01-01', expiry: '2026-01-15', status: 'normal' },
  ];

  const temperatureLogs = {
    principal: [{ date: '2024-11-08', time: '08:00', temp: '22.1°C', user: 'Sistema' }],
    fria: [{ date: '2024-11-08', time: '08:00', temp: '4.2°C', user: 'Sistema' }],
    controlados: [{ date: '2024-11-08', time: '08:00', temp: '20.5°C', user: 'Sistema' }]
  };

  const getStockStatus = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return { status: 'Crítico', color: 'text-red-600', bg: 'bg-red-100' };
    if (percentage <= 30) return { status: 'Baixo', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage >= 90) return { status: 'Alto', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const filteredItems = inventoryItems.filter(item => item.warehouse === activeWarehouse);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600 mt-1">Gestão em tempo real do inventário farmacêutico</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline"><BarChart3 className="h-4 w-4 mr-2" />Relatório</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
            </DialogTrigger>
            <StockMovementModal />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="principal" onValueChange={setActiveWarehouse}>
        <TabsList className="mb-6">
          <TabsTrigger value="principal">Armazém Principal</TabsTrigger>
          <TabsTrigger value="fria">Câmara Fria</TabsTrigger>
          <TabsTrigger value="controlados">Controlados</TabsTrigger>
        </TabsList>
        <TabsContent value="principal" />
        <TabsContent value="fria" />
        <TabsContent value="controlados" />
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Itens em Estoque</CardTitle><CardDescription>Monitoramento de níveis e condições</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const stockStatus = getStockStatus(item.currentStock, item.minStock, item.maxStock);
                    const stockPercentage = (item.currentStock / item.maxStock) * 100;
                    return (
                      <TableRow key={item.id}>
                        <TableCell><div><p className="font-medium">{item.product}</p><p className="text-sm text-gray-500">Lote: {item.batch}</p></div></TableCell>
                        <TableCell className="font-mono text-sm">{item.location}</TableCell>
                        <TableCell><div className="space-y-2 w-32"><div className="flex items-center justify-between"><span className="text-sm font-medium">{item.currentStock}</span><span className="text-xs text-gray-500">/{item.maxStock}</span></div><Progress value={stockPercentage} className="h-2" /></div></TableCell>
                        <TableCell><Badge className={`${stockStatus.bg} ${stockStatus.color}`}>{stockStatus.status}</Badge></TableCell>
                        <TableCell><div className="flex items-center space-x-1"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-sm">{item.expiry}</span></div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Registro de Temperatura</CardTitle><CardDescription>Últimas leituras do armazém</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Temp.</TableHead><TableHead>Usuário</TableHead></TableRow></TableHeader>
                <TableBody>
                  {temperatureLogs[activeWarehouse as keyof typeof temperatureLogs]?.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell><p className="text-sm">{log.date}</p><p className="text-xs text-gray-500">{log.time}</p></TableCell>
                      <TableCell className="font-mono text-lg">{log.temp}</TableCell>
                      <TableCell>{log.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setIsTempModalOpen(true)}>Registrar Temperatura</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isTempModalOpen} onOpenChange={setIsTempModalOpen}>
        <RegisterTemperatureModal warehouseName={warehouseNames[activeWarehouse]} />
      </Dialog>
    </>
  );
}
