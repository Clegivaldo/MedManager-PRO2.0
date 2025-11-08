import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Thermometer,
  Shield
} from 'lucide-react';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const products = [
    {
      id: 'PRD-001',
      name: 'Paracetamol 500mg',
      category: 'Analgésico',
      anvisa: 'MS-1.0573.0240',
      batch: 'L240801',
      expiry: '2025-08-01',
      stock: 1250,
      minStock: 100,
      price: 12.50,
      status: 'active',
      controlled: false,
      temperature: '15-30°C'
    },
    {
      id: 'PRD-002',
      name: 'Amoxicilina 875mg',
      category: 'Antibiótico',
      anvisa: 'MS-1.0573.0241',
      batch: 'L240802',
      expiry: '2025-06-15',
      stock: 45,
      minStock: 50,
      price: 28.90,
      status: 'low_stock',
      controlled: true,
      temperature: '15-25°C'
    },
    {
      id: 'PRD-003',
      name: 'Insulina NPH',
      category: 'Hormônio',
      anvisa: 'MS-1.0573.0242',
      batch: 'L240803',
      expiry: '2024-12-30',
      stock: 89,
      minStock: 20,
      price: 145.00,
      status: 'expiring',
      controlled: true,
      temperature: '2-8°C'
    },
    {
      id: 'PRD-004',
      name: 'Dipirona 500mg',
      category: 'Analgésico',
      anvisa: 'MS-1.0573.0243',
      batch: 'L240804',
      expiry: '2026-03-20',
      stock: 890,
      minStock: 100,
      price: 8.75,
      status: 'active',
      controlled: false,
      temperature: '15-30°C'
    }
  ];

  const getStatusBadge = (status: string, stock: number, minStock: number) => {
    if (status === 'expiring') {
      return <Badge variant="destructive">Vencendo</Badge>;
    }
    if (stock <= minStock) {
      return <Badge variant="destructive">Estoque Baixo</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.anvisa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header da Página */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Produtos Farmacêuticos</h1>
              <p className="text-gray-600 mt-1">Gestão completa do catálogo de medicamentos</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Produto</DialogTitle>
                  <DialogDescription>
                    Adicione um novo medicamento ao catálogo com informações de conformidade ANVISA
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Nome do Produto</Label>
                    <Input id="product-name" placeholder="Ex: Paracetamol 500mg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analgesico">Analgésico</SelectItem>
                        <SelectItem value="antibiotico">Antibiótico</SelectItem>
                        <SelectItem value="hormonio">Hormônio</SelectItem>
                        <SelectItem value="vitamina">Vitamina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anvisa-code">Registro ANVISA</Label>
                    <Input id="anvisa-code" placeholder="MS-1.0573.0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input id="price" type="number" step="0.01" placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-stock">Estoque Mínimo</Label>
                    <Input id="min-stock" type="number" placeholder="100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperatura</Label>
                    <Input id="temperature" placeholder="15-30°C" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" placeholder="Descrição detalhada do produto..." />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Cadastrar Produto</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                    <p className="text-2xl font-bold text-gray-900">2.847</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Controlados</p>
                    <p className="text-2xl font-bold text-gray-900">156</p>
                  </div>
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-gray-900">23</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vencendo</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                  </div>
                  <Calendar className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Busca */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, código ANVISA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    <SelectItem value="Analgésico">Analgésico</SelectItem>
                    <SelectItem value="Antibiótico">Antibiótico</SelectItem>
                    <SelectItem value="Hormônio">Hormônio</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Produtos */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Catálogo de Produtos</CardTitle>
              <CardDescription>
                {filteredProducts.length} produtos encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>ANVISA</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Package className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{product.category}</span>
                          {product.controlled && (
                            <Shield className="h-4 w-4 text-red-600" title="Substância Controlada" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.anvisa}</TableCell>
                      <TableCell className="font-mono text-sm">{product.batch}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{product.expiry}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <p className="font-medium">{product.stock.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Mín: {product.minStock}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {product.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(product.status, product.stock, product.minStock)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}