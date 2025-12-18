import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { AlertCircle, Package, Calendar } from 'lucide-react';

export default function StockHealthCards() {
    const [stockHealth, setStockHealth] = useState({
        criticalStock: 0,
        expiringItems: 0,
        healthPercentage: 100,
    });

    // Placeholder - estas métricas viriam de um endpoint dedicado
    useEffect(() => {
        // TODO: Implementar endpoint de stock health
        setStockHealth({
            criticalStock: 3,
            expiringItems: 7,
            healthPercentage: 92,
        });
    }, []);

    const healthColor =
        stockHealth.healthPercentage >= 90 ? 'text-green-600' :
            stockHealth.healthPercentage >= 70 ? 'text-yellow-600' :
                'text-red-600';

    const healthBg =
        stockHealth.healthPercentage >= 90 ? 'bg-green-100' :
            stockHealth.healthPercentage >= 70 ? 'bg-yellow-100' :
                'bg-red-100';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saúde do Estoque</CardTitle>
                    <div className={`p-2 rounded-lg ${healthBg}`}>
                        <Package className={`h-4 w-4 ${healthColor}`} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${healthColor}`}>
                        {stockHealth.healthPercentage}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Sistema operando normalmente
                    </p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
                    <div className="p-2 rounded-lg bg-red-100">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                        {stockHealth.criticalStock}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Produtos abaixo do mínimo
                    </p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vencendo em Breve</CardTitle>
                    <div className="p-2 rounded-lg bg-yellow-100">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                        {stockHealth.expiringItems}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Produtos nos próximos 30 dias
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
