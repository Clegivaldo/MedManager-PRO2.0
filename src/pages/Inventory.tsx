import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Thermometer,
  AlertTriangle,
  Warehouse as WarehouseIcon,
  Edit,
  Trash2,
} from 'lucide-react';
import WarehouseModal from '@/components/tenant/modals/WarehouseModal';
import RegisterTemperatureModal from '@/components/tenant/modals/RegisterTemperatureModal';
import TemperatureChart from '@/components/tenant/charts/TemperatureChart';
import warehouseService, { Warehouse } from '@/services/warehouse.service';
import temperatureService, { LatestReading } from '@/services/temperature.service';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>('');
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [warehouseMode, setWarehouseMode] = useState<'create' | 'edit'>('create');
  const [latestReadings, setLatestReadings] = useState<LatestReading[]>([]);
  const { toast } = useToast();

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseService.list({ status: 'active' });
      setWarehouses(response.warehouses || []);
      if (response.warehouses.length > 0 && !activeWarehouseId) {
        setActiveWarehouseId(response.warehouses[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os armazéns.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemperatures = async () => {
    try {
      const readings = await temperatureService.getLatest();
      setLatestReadings(readings);
    } catch (error) {
      console.error('Error loading temperatures:', error);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadTemperatures();

    // Poll temperatures every 2 minutes
    const interval = setInterval(loadTemperatures, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateWarehouse = () => {
    setSelectedWarehouse(null);
    setWarehouseMode('create');
    setIsWarehouseModalOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setWarehouseMode('edit');
    setIsWarehouseModalOpen(true);
  };

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    if (!confirm(`Deseja realmente desativar o armazém "${warehouse.name}"?`)) {
      return;
    }

    try {
      await warehouseService.delete(warehouse.id);
      toast({
        title: 'Armazém desativado',
        description: 'O armazém foi desativado com sucesso.',
      });
      loadWarehouses();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível desativar o armazém.',
        variant: 'destructive',
      });
    }
  };

  const handleWarehouseSuccess = () => {
    setIsWarehouseModalOpen(false);
    loadWarehouses();
  };

  const handleRecordTemperature = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsTempModalOpen(true);
  };

  const getTemperatureStatus = (reading: LatestReading | undefined) => {
    if (!reading || !reading.latestReading) {
      return { status: 'Sem dados', color: 'text-gray-400', bg: 'bg-gray-100' };
    }

    if (reading.latestReading.isAlert) {
      return { status: 'Alerta', color: 'text-red-600', bg: 'bg-red-100' };
    }

    return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const getTemperatureReading = (warehouseId: string) => {
    return latestReadings.find(r => r.warehouseId === warehouseId);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600 mt-1">Gestão de armazéns e monitoramento de temperatura</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleCreateWarehouse}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Armazém
          </Button>
        </div>
      </div>

      {/* Temperature Alerts */}
      {latestReadings.some(r => r.latestReading?.isAlert) && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Temperatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {latestReadings
                .filter(r => r.latestReading?.isAlert)
                .map((reading) => (
                  <div key={reading.warehouseId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">{reading.warehouseName}</p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {reading.latestReading?.alertMessage}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {reading.latestReading?.temperature.toFixed(1)}°C
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <TableSkeleton columns={4} />
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title="Nenhum armazém cadastrado"
          description="Crie seu primeiro armazém para começar o controle de estoque."
          action={<Button onClick={handleCreateWarehouse}>Criar Primeiro Armazém</Button>}
        />
      ) : (
        <>
          <Tabs value={activeWarehouseId} onValueChange={setActiveWarehouseId} className="mb-6">
            <TabsList>
              {warehouses.map((warehouse) => (
                <TabsTrigger key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {warehouses.map((warehouse) => (
              <TabsContent key={warehouse.id} value={warehouse.id}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Warehouse Management */}
                  <div className="lg:col-span-2">
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Informações do Armazém</CardTitle>
                            <CardDescription>Código: {warehouse.code}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditWarehouse(warehouse)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteWarehouse(warehouse)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {warehouse.description && (
                            <div>
                              <p className="text-sm text-gray-500">Descrição</p>
                              <p>{warehouse.description}</p>
                            </div>
                          )}
                          {warehouse.address && (
                            <div>
                              <p className="text-sm text-gray-500">Endereço</p>
                              <p>{warehouse.address}</p>
                            </div>
                          )}
                          {(warehouse.temperatureMin || warehouse.temperatureMax) && (
                            <div>
                              <p className="text-sm text-gray-500">Faixa de Temperatura</p>
                              <p className="flex items-center gap-2">
                                {warehouse.temperatureMin !== null && `${warehouse.temperatureMin}°C`}
                                {warehouse.temperatureMin !== null && warehouse.temperatureMax !== null && ' - '}
                                {warehouse.temperatureMax !== null && `${warehouse.temperatureMax}°C`}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Temperature Monitoring */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Thermometer className="h-5 w-5" />
                        Temperatura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const reading = getTemperatureReading(warehouse.id);
                        const status = getTemperatureStatus(reading);

                        return (
                          <div className="space-y-4">
                            {reading?.latestReading ? (
                              <>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                  <p className={`text-4xl font-bold ${status.color}`}>
                                    {reading.latestReading.temperature.toFixed(1)}°C
                                  </p>
                                  {reading.latestReading.humidity && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      Umidade: {reading.latestReading.humidity.toFixed(1)}%
                                    </p>
                                  )}
                                  <Badge className={`mt-2 ${status.bg} ${status.color}`}>
                                    {status.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                  Última leitura: {new Date(reading.latestReading.recordedAt).toLocaleString('pt-BR')}
                                </p>
                              </>
                            ) : (
                              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <p className="text-gray-500">Nenhuma leitura registrada</p>
                              </div>
                            )}

                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => handleRecordTemperature(warehouse)}
                            >
                              <Thermometer className="h-4 w-4 mr-2" />
                              Registrar Temperatura
                            </Button>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      <Dialog open={isWarehouseModalOpen} onOpenChange={setIsWarehouseModalOpen}>
        <WarehouseModal
          warehouse={selectedWarehouse}
          mode={warehouseMode}
          onSuccess={handleWarehouseSuccess}
        />
      </Dialog>

      <Dialog open={isTempModalOpen} onOpenChange={setIsTempModalOpen}>
        <RegisterTemperatureModal
          warehouseName={selectedWarehouse?.name || ''}
          warehouseId={selectedWarehouse?.id}
          onSuccess={() => {
            setIsTempModalOpen(false);
            loadTemperatures();
          }}
        />
      </Dialog>
    </>
  );
}
