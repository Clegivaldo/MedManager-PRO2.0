import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Shield
} from 'lucide-react';
import ProductDetailsModal from '@/components/tenant/modals/ProductDetailsModal';
import EditProductModal from '@/components/tenant/modals/EditProductModal';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';

export default function Products() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const products = [
    { id: 'PRD-001', name: 'Paracetamol 500mg', category: 'Analgésico', anvisa: 'MS-1.0573.0240', batch: 'L240801', expiry: '2025-08-01', stock: 1250, minStock: 100, price: 12.50, status: 'active', controlled: false, temperature: '15-30°C' },
    { id: 'PRD-002', name: 'Amoxicilina 875mg', category: 'Antibiótico', anvisa: 'MS-1.0573.0241', batch: 'L240802', expiry: '2025-06-15', stock: 45, minStock: 50, price: 28.90, status: 'low_stock', controlled: true, temperature: '15-25°C' },
    { id: 'PRD-003', name: 'Insulina NPH', category: 'Hormônio', anvisa: 'MS-1.0573.0242', batch: 'L240803', expiry: '2024-12-30', stock: 89, minStock: 20, price: 145.00, status: 'expiring', controlled: true, temperature: '2-8°C' },
    { id: 'PRD-004', name: 'Dipirona 500mg', category: 'Analgésico', anvisa: 'MS-1.0573.0243', batch: 'L240804', expiry: '2026-03-20', stock: 890, minStock: 100, price: 8.75, status: 'active', controlled: false, temperature: '15-30°C' }
  ];

  const handleViewDetails = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string, stock: number, minStock: number) => {
    if (status === 'expiring') return <Badge variant="destructive">Vencendo</Badge>;
    if (stock <= minStock) return <Badge variant="destructive">Estoque Baixo</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.anvisa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos Farmacêuticos</h1>
          <p className="text-gray-600 mt-1">Gestão completa do catálogo de medicamentos</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nome, código ANVISA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="Analgésico">Analgésico</SelectItem>
                <SelectItem value="Antibiótico">Antibiótico</SelectItem>
                <SelectItem value="Hormônio">Hormônio</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>{filteredProducts.length} produtos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={6} />
          ) : filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>ANVISA</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{product.category}</span>
                        {product.controlled && <Shield className="h-4 w-4 text-red-600" title="Substância Controlada" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.anvisa}</TableCell>
                    <TableCell>
                      <div className="text-right">
                        <p className="font-medium">{product.stock.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Mín: {product.minStock}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status, product.stock, product.minStock)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(product)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}><Edit className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Package className="h-16 w-16" />}
              title="Nenhum produto encontrado"
              description="Cadastre seu primeiro produto para começar a gerenciar seu catálogo."
              action={
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <ProductDetailsModal product={selectedProduct} />
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditProductModal product={selectedProduct} mode={editMode} />
      </Dialog>
    </>
  );
}
