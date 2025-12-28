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
import productService, { Product } from '@/services/product.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Products() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.list({
        page,
        limit: 50,
        search: searchTerm || undefined,
        status: 'active',
      });
      setProducts(response.products || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ CORREÇÃO: Só carregar dados após autenticação estar completa
    if (!authLoading && isAuthenticated) {
      loadProducts();
    }
  }, [page, searchTerm, authLoading, isAuthenticated]);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditMode('edit');
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setEditMode('create');
    setIsEditOpen(true);
  };

  const getStatusBadge = (product: Product) => {
    if (!product.isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inativo</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>;
  };

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
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>{total} produtos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={6} />
          ) : products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código ANVISA</TableHead>
                  <TableHead>Laboratório</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{product.name}</p>
                            {product.isControlled && (
                              <span title="Substância Controlada">
                                <Shield className="h-4 w-4 text-red-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{product.internalCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.anvisaCode || '-'}</TableCell>
                    <TableCell>{product.laboratory || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.productType}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(product)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(product)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Nenhum produto encontrado"
              description="Não há produtos cadastrados no sistema."
              action={<Button onClick={handleCreate}>Adicionar Primeiro Produto</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <ProductDetailsModal product={selectedProduct} />
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <EditProductModal
          product={selectedProduct}
          mode={editMode}
          onSuccess={() => {
            loadProducts();
            setIsEditOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}
