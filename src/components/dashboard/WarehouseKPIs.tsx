import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { Warehouse, TrendingUp, TrendingDown, AlertTriangle, Thermometer } from 'lucide-react';
import warehouseService from '@/services/warehouse.service';
import temperatureService from '@/services/temperature.service';
import { useAuth } from '@/contexts/AuthContext';

export default function WarehouseKPIs() {
    const [stats, setStats] = useState({
        totalWarehouses: 0,
        activeWarehouses: 0,
        temperatureAlerts: 0,
        stockItems: 0,
    });
    const [loading, setLoading] = useState(true);
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        // ✅ CORREÇÃO: Só carregar dados após autenticação estar completa
        if (!authLoading && isAuthenticated) {
            loadStats();
        }
    }, [authLoading, isAuthenticated]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [warehousesResponse, temperatureResponse] = await Promise.all([
                warehouseService.list({ limit: 100 }),
                temperatureService.getAlerts(100),
            ]);

            const warehouses = warehousesResponse.data.warehouses || [];
            const active = warehouses.filter((w: any) => w.isActive).length;
            const stockCount = warehouses.reduce((sum: number, w: any) => sum + (w._count?.stock || 0), 0);

            setStats({
                totalWarehouses: warehouses.length,
                activeWarehouses: active,
                temperatureAlerts: temperatureResponse.data?.length || 0,
                stockItems: stockCount,
            });
        } catch (error) {
            console.error('Error loading warehouse stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const kpis = [
        {
            title: 'Armazéns Ativos',
            value: stats.activeWarehouses,
            total: stats.totalWarehouses,
            icon: Warehouse,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Itens em Estoque',
            value: stats.stockItems.toLocaleString(),
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            title: 'Alertas de Temperatura',
            value: stats.temperatureAlerts,
            icon: stats.temperatureAlerts > 0 ? AlertTriangle : Thermometer,
            color: stats.temperatureAlerts > 0 ? 'text-red-600' : 'text-gray-600',
            bgColor: stats.temperatureAlerts > 0 ? 'bg-red-100' : 'bg-gray-100',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border border-gray-200 shadow-sm">
                        <CardContent className="p-6">
                            <div className="h-20 bg-gray-100 animate-pulse rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                    <Card key={index} className="border border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                                <Icon className={`h-4 w-4 ${kpi.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {kpi.value}
                                {kpi.total && <span className="text-sm text-gray-500 ml-1">/ {kpi.total}</span>}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
