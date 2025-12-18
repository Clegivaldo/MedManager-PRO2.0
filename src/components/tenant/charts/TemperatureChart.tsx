import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { useEffect, useState } from 'react';
import temperatureService from '@/services/temperature.service';
import { Thermometer } from 'lucide-react';

interface TemperatureChartProps {
    warehouseId: string;
    warehouseName: string;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
}

export default function TemperatureChart({ warehouseId, warehouseName, temperatureMin, temperatureMax }: TemperatureChartProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [warehouseId]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await temperatureService.getHistory(warehouseId, 1, 100);

            // Convert to chart format
            const chartData = response.readings
                .reverse() // Order oldest to newest
                .map((reading: any) => ({
                    time: new Date(reading.recordedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    temperature: reading.temperature,
                    humidity: reading.humidity || 0,
                    isAlert: reading.isAlert,
                }));

            setData(chartData);
        } catch (error) {
            console.error('Error loading temperature history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Thermometer className="h-5 w-5" />
                        Histórico de Temperatura
                    </CardTitle>
                    <CardDescription>{warehouseName}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                        Carregando...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Thermometer className="h-5 w-5" />
                        Histórico de Temperatura
                    </CardTitle>
                    <CardDescription>{warehouseName}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                        Nenhum dado de temperatura registrado
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5" />
                    Histórico de Temperatura (Últimas 24h)
                </CardTitle>
                <CardDescription>
                    {warehouseName}
                    {(temperatureMin || temperatureMax) && (
                        <span className="ml-2">
                            • Faixa ideal: {temperatureMin !== null && `${temperatureMin}°C`}
                            {temperatureMin !== null && temperatureMax !== null && ' - '}
                            {temperatureMax !== null && `${temperatureMax}°C`}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                            label={{ value: '°C', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                            }}
                            formatter={(value: any) => [`${value.toFixed(1)}°C`, 'Temperatura']}
                        />

                        {/* Reference lines for min/max */}
                        {temperatureMax !== null && (
                            <ReferenceLine
                                y={temperatureMax}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                label={{ value: 'Max', position: 'right', fill: '#ef4444' }}
                            />
                        )}
                        {temperatureMin !== null && (
                            <ReferenceLine
                                y={temperatureMin}
                                stroke="#3b82f6"
                                strokeDasharray="3 3"
                                label={{ value: 'Min', position: 'right', fill: '#3b82f6' }}
                            />
                        )}

                        <Area
                            type="monotone"
                            dataKey="temperature"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorTemp)"
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Alert indicator */}
                {data.some(d => d.isAlert) && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                            ⚠️ Alertas detectados no período. Verifique as temperaturas fora do intervalo configurado.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
