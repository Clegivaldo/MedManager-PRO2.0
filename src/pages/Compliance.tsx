import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import {
  Shield,
  Thermometer,
  Truck,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  Eye,
  Download,
  Upload
} from 'lucide-react';

export default function Compliance() {
  const complianceMetrics = [
    {
      title: 'RDC 430 - Temperatura',
      status: 'compliant',
      percentage: 100,
      description: 'Monitoramento de temperatura',
      lastCheck: '2024-11-07 10:30'
    },
    {
      title: 'Portaria 344/98',
      status: 'compliant',
      percentage: 95,
      description: 'Substâncias controladas',
      lastCheck: '2024-11-07 09:15'
    },
    {
      title: 'Guia 33',
      status: 'warning',
      percentage: 85,
      description: 'Transporte de medicamentos',
      lastCheck: '2024-11-06 16:45'
    },
    {
      title: 'Qualidade',
      status: 'compliant',
      percentage: 98,
      description: 'Controle de qualidade',
      lastCheck: '2024-11-07 08:00'
    }
  ];

  const temperatureReadings = [
    {
      sensor: 'Sensor A-01',
      location: 'Câmara Fria 1',
      temperature: '4.2°C',
      status: 'normal',
      range: '2-8°C',
      lastReading: '2024-11-07 10:30'
    },
    {
      sensor: 'Sensor B-02',
      location: 'Estoque Geral',
      temperature: '22.1°C',
      status: 'normal',
      range: '15-30°C',
      lastReading: '2024-11-07 10:30'
    },
    {
      sensor: 'Sensor C-03',
      location: 'Câmara Fria 2',
      temperature: '6.8°C',
      status: 'warning',
      range: '2-8°C',
      lastReading: '2024-11-07 10:25'
    }
  ];

  const guia33Records = [
    {
      id: 'G33-2024-001',
      destination: 'Drogaria São Paulo',
      products: 'Insulina NPH, Amoxicilina',
      status: 'aprovado',
      date: '2024-11-05',
      driver: 'João Santos',
      vehicle: 'ABC-1234'
    },
    {
      id: 'G33-2024-002',
      destination: 'Farmácia Popular',
      products: 'Paracetamol, Dipirona',
      status: 'pendente',
      date: '2024-11-07',
      driver: 'Maria Silva',
      vehicle: 'DEF-5678'
    },
    {
      id: 'G33-2024-003',
      destination: 'Rede Bem Estar',
      products: 'Controlados Diversos',
      status: 'em_transito',
      date: '2024-11-06',
      driver: 'Pedro Costa',
      vehicle: 'GHI-9012'
    }
  ];

  const qualityControls = [
    {
      id: 'QC-001',
      product: 'Paracetamol 500mg',
      batch: 'L240801',
      test: 'Análise Microbiológica',
      result: 'Aprovado',
      date: '2024-11-05',
      analyst: 'Dr. Ana Costa'
    },
    {
      id: 'QC-002',
      product: 'Amoxicilina 875mg',
      batch: 'L240802',
      test: 'Teor de Princípio Ativo',
      result: 'Aprovado',
      date: '2024-11-04',
      analyst: 'Dr. Carlos Silva'
    },
    {
      id: 'QC-003',
      product: 'Insulina NPH',
      batch: 'L240803',
      test: 'Estabilidade Térmica',
      result: 'Em Análise',
      date: '2024-11-07',
      analyst: 'Dra. Lucia Santos'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'aprovado':
      case 'normal':
      case 'Aprovado':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      case 'em_transito':
      case 'Em Análise':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'aprovado':
      case 'normal':
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'pendente':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
      case 'rejeitado':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'em_transito':
      case 'Em Análise':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
              <h1 className="text-3xl font-bold text-gray-900">Conformidade ANVISA</h1>
              <p className="text-gray-600 mt-1">Monitoramento regulatório e controle de qualidade</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Relatório
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Enviar Dados
              </Button>
            </div>
          </div>

          {/* Métricas de Conformidade */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {complianceMetrics.map((metric, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metric.status)}
                      <h3 className="font-medium text-sm">{metric.title}</h3>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.percentage}%
                    </Badge>
                  </div>
                  <Progress value={metric.percentage} className="h-2 mb-3" />
                  <p className="text-xs text-gray-600">{metric.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Última verificação: {metric.lastCheck}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs de Conformidade */}
          <Tabs defaultValue="temperature" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="temperature" className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4" />
                <span>Temperatura</span>
              </TabsTrigger>
              <TabsTrigger value="guia33" className="flex items-center space-x-2">
                <Truck className="h-4 w-4" />
                <span>Guia 33</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Qualidade</span>
              </TabsTrigger>
              <TabsTrigger value="controlled" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Controlados</span>
              </TabsTrigger>
            </TabsList>

            {/* Monitoramento de Temperatura */}
            <TabsContent value="temperature">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Thermometer className="h-5 w-5 mr-2 text-blue-600" />
                    Monitoramento de Temperatura (RDC 430)
                  </CardTitle>
                  <CardDescription>
                    Controle em tempo real das condições de armazenamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sensor</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Temperatura</TableHead>
                        <TableHead>Faixa Ideal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Leitura</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {temperatureReadings.map((reading, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{reading.sensor}</TableCell>
                          <TableCell>{reading.location}</TableCell>
                          <TableCell className="font-mono text-lg">{reading.temperature}</TableCell>
                          <TableCell className="text-sm text-gray-600">{reading.range}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reading.status)}>
                              {reading.status === 'normal' ? 'Normal' : 'Atenção'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{reading.lastReading}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guia 33 */}
            <TabsContent value="guia33">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-green-600" />
                    Controle de Transporte (Guia 33)
                  </CardTitle>
                  <CardDescription>
                    Rastreamento de medicamentos em transporte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guia</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Produtos</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guia33Records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.id}</TableCell>
                          <TableCell>{record.destination}</TableCell>
                          <TableCell className="max-w-48 truncate">{record.products}</TableCell>
                          <TableCell>{record.driver}</TableCell>
                          <TableCell className="font-mono">{record.vehicle}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status === 'aprovado' ? 'Aprovado' : 
                               record.status === 'pendente' ? 'Pendente' : 'Em Trânsito'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Controle de Qualidade */}
            <TabsContent value="quality">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-600" />
                    Controle de Qualidade
                  </CardTitle>
                  <CardDescription>
                    Análises e testes de qualidade dos produtos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Teste</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityControls.map((control) => (
                        <TableRow key={control.id}>
                          <TableCell className="font-mono">{control.id}</TableCell>
                          <TableCell>{control.product}</TableCell>
                          <TableCell className="font-mono">{control.batch}</TableCell>
                          <TableCell>{control.test}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(control.result)}>
                              {control.result}
                            </Badge>
                          </TableCell>
                          <TableCell>{control.date}</TableCell>
                          <TableCell>{control.analyst}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Substâncias Controladas */}
            <TabsContent value="controlled">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-red-600" />
                    Substâncias Controladas (Portaria 344/98)
                  </CardTitle>
                  <CardDescription>
                    Controle rigoroso de medicamentos controlados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border border-red-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Lista A1</p>
                            <p className="text-2xl font-bold text-gray-900">12</p>
                            <p className="text-xs text-gray-500">Entorpecentes</p>
                          </div>
                          <Shield className="h-8 w-8 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-yellow-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Lista B1</p>
                            <p className="text-2xl font-bold text-gray-900">34</p>
                            <p className="text-xs text-gray-500">Psicotrópicos</p>
                          </div>
                          <Shield className="h-8 w-8 text-yellow-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Lista C1</p>
                            <p className="text-2xl font-bold text-gray-900">89</p>
                            <p className="text-xs text-gray-500">Outras</p>
                          </div>
                          <Shield className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Atenção - Substâncias Controladas</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Todos os movimentos de substâncias controladas são monitorados e reportados automaticamente 
                          aos órgãos competentes conforme Portaria 344/98.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}