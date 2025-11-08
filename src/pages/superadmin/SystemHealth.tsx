import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Server, Database, Cpu, MemoryStick, AlertTriangle, CheckCircle } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export default function SystemHealth() {
  const chartData = [
    { name: '08:00', api_latency: 120 },
    { name: '09:00', api_latency: 150 },
    { name: '10:00', api_latency: 110 },
    { name: '11:00', api_latency: 180 },
    { name: '12:00', api_latency: 90 },
  ];

  const services = [
    { name: 'API Principal', status: 'operational', icon: Server },
    { name: 'Banco de Dados Primário', status: 'operational', icon: Database },
    { name: 'Serviço de NFe', status: 'operational', icon: Server },
    { name: 'Fila de Background Jobs', status: 'degraded', icon: Server },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saúde do Sistema</h1>
        <p className="text-gray-600 mt-1">Monitoramento em tempo real da infraestrutura do MedManager-PRO</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>Uso de CPU</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Cpu className="h-10 w-10 text-blue-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">34%</p>
                <Progress value={34} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Uso de Memória</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <MemoryStick className="h-10 w-10 text-green-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">58%</p>
                <Progress value={58} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Conexões ao Banco</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Database className="h-10 w-10 text-purple-500" />
              <div className="w-full">
                <p className="text-2xl font-bold">128 / 500</p>
                <Progress value={(128/500)*100} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Latência da API (ms)</CardTitle>
            <CardDescription>Tempo de resposta médio nos últimos 5 minutos.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Bar dataKey="api_latency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status dos Serviços</CardTitle>
            <CardDescription>Disponibilidade dos microserviços.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map(service => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <service.icon className="h-5 w-5 text-gray-500" />
                  <span>{service.name}</span>
                </div>
                {service.status === 'operational' ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> Operacional</Badge>
                ) : (
                  <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/> Degradado</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
