import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import {
  Warehouse,
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Thermometer,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

export default function Inventory() {
  const [selectedMovementType, setSelectedMovementType] = useState('entrada');

  const inventoryItems = [
    {
      id: 'INV-001',
      product: 'Paracetamol 500mg',
      batch: 'L240801',
      currentStock: 1250,
      minStock: 100,
      maxStock: 2000,
      location: 'A-01-15',
      temperature: '22°C',
      expiry: '2025-08-01',
      lastMovement: '2024-11-05',
      status: 'normal'
    },
    {
      id: 'INV-002',
      product: 'Amoxicilina 875mg',
      batch: 'L240802',
      currentStock: 45,
      minStock: 50,
      maxStock: 500,
      location: 'B-02-08',
      temperature: '20°C',
      expiry: '2025-06-15',
      lastMovement: '2024-11-06',
      status: 'low'
    },
    {
      id: 'INV-003',
      product: 'Insulina NPH',
      batch: 'L240803',
      currentStock: 89,
      minStock: 20,
      maxStock: 200,
      location: 'C-01-05',
      temperature: '4°C',
      expiry: '2024-12-30',
      lastMovement: '2024-11-04',
      status: 'expiring'
    }
  ];

  const recentMovements = [
    {
      id: 'MOV-001',
      product: 'Paracetamol 500mg',
      type: 'entrada',
      quantity: 500,
      batch: 'L240801',
      date: '2024-11-07 09:30',
      user: 'João Silva',
      reason: 'Recebimento de fornecedor'
    },
    {
      id: 'MOV-002',
      product: 'Dipirona 500mg',
      type: 'saida',
      quantity: 150,
      batch: 'L240804',
      date: '2024-11-07 08:15',
      user: 'Maria Santos',
      reason: 'Venda para cliente'
    },
    {
      id: 'MOV-003',
      product: 'Amoxicilina 875mg',
      type: 'ajuste',
      quantity: -5,
      batch: 'L240802',
      date: '2024-11-06 16:45',
      user: 'Pedro Costa',
      reason: 'Ajuste de inventário'
    }
  ];

  const getStockStatus = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return { status: 'Crítico', color: 'text-red-600', bg: 'bg-red-100' };
    if (percentage <= 30) return { status: 'Baixo', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage >= 90) return { status: 'Alto', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'saida': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'ajuste': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header da Página */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
              <p className="text-gray-600 mt-1">Gestão em tempo real do inventário farmacêutico</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Relatório
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Movimentação
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Movimentação</DialogTitle>
                    <DialogDescription>
                      Registre entrada, saída ou ajuste de estoque
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="movement-type">Tipo de Movimentação</Label>
                      <Select value={selectedMovementType} onValueChange={setSelectedMovementType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                          <SelectItem value="ajuste">Ajuste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-select">Produto</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paracetamol">Paracetamol 500mg</SelectItem>
                          <SelectItem value="amoxicilina">Amoxicilina 875mg</SelectItem>
                          <SelectItem value="insulina">Insulina NPH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input id="quantity" type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch">Lote</Label>
                      <Input id="batch" placeholder="L240801" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Motivo</Label>
                      <Input id="reason" placeholder="Descreva o motivo da movimentação" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">Cancelar</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Métricas de Estoque */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Valor Total</p>
                    <p className="text-2xl font-bold text-gray-900">R$ 2.4M</p>
                    <p className="text-xs text-green-600 mt-1">+5.2% este mês</p>
                  </div>
                  <Warehouse className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Itens Únicos</p>
                    <p className="text-2xl font-bold text-gray-900">2.847</p>
                    <p className="text-xs text-blue-600 mt-1">156 controlados</p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-gray-900">23</p>
                    <p className="text-xs text-red-600 mt-1">Requer atenção</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Temp. Média</p>
                    <p className="text-2xl font-bold text-gray-900">18°C</p>
                    <p className="text-xs text-green-600 mt-1">Dentro da faixa</p>
                  </div>
                  <Thermometer className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Itens de Estoque */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Itens em Estoque</CardTitle>
                  <CardDescription>
                    Monitoramento de níveis e condições de armazenamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Temp.</TableHead>
                        <TableHead>Validade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryItems.map((item) => {
                        const stockStatus = getStockStatus(item.currentStock, item.minStock, item.maxStock);
                        const stockPercentage = (item.currentStock / item.maxStock) * 100;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product}</p>
                                <p className="text-sm text-gray-500">Lote: {item.batch}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.location}</TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{item.currentStock}</span>
                                  <span className="text-xs text-gray-500">/{item.maxStock}</span>
                                </div>
                                <Progress value={stockPercentage} className="h-2" />
                                <p className="text-xs text-gray-500">Mín: {item.minStock}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${stockStatus.bg} ${stockStatus.color}`}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Thermometer className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{item.temperature}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{item.expiry}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Movimentações Recentes */}
            <div>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Movimentações Recentes</CardTitle>
                  <CardDescription>
                    Últimas alterações no estoque
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="mt-1">
                        {getMovementIcon(movement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{movement.product}</p>
                        <p className="text-xs text-gray-600">{movement.reason}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-medium ${
                            movement.type === 'entrada' ? 'text-green-600' : 
                            movement.type === 'saida' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {movement.type === 'entrada' ? '+' : movement.type === 'saida' ? '-' : '±'}
                            {Math.abs(movement.quantity)}
                          </span>
                          <span className="text-xs text-gray-500">{movement.date}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">por {movement.user}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}