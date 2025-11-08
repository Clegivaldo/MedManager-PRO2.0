import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Product {
  id: string;
  name: string;
  category: string;
  anvisa: string;
  price: number;
  minStock: number;
  temperature: string;
}

interface EditProductModalProps {
  product: Product | null;
  mode: 'create' | 'edit';
}

export default function EditProductModal({ product, mode }: EditProductModalProps) {
  const title = mode === 'edit' ? 'Editar Produto' : 'Cadastrar Novo Produto';
  const description = mode === 'edit' ? `Editando informações para ${product?.name}.` : 'Adicione um novo medicamento ao catálogo.';

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">Nome do Produto</Label>
          <Input id="product-name" defaultValue={product?.name} placeholder="Ex: Paracetamol 500mg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select defaultValue={product?.category}>
            <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Analgésico">Analgésico</SelectItem>
              <SelectItem value="Antibiótico">Antibiótico</SelectItem>
              <SelectItem value="Hormônio">Hormônio</SelectItem>
              <SelectItem value="Vitamina">Vitamina</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="anvisa-code">Registro ANVISA</Label>
          <Input id="anvisa-code" defaultValue={product?.anvisa} placeholder="MS-1.0573.0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input id="price" type="number" step="0.01" defaultValue={product?.price} placeholder="0,00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-stock">Estoque Mínimo</Label>
          <Input id="min-stock" type="number" defaultValue={product?.minStock} placeholder="100" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperatura</Label>
          <Input id="temperature" defaultValue={product?.temperature} placeholder="15-30°C" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" placeholder="Descrição detalhada do produto..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Produto</Button>
      </DialogFooter>
    </DialogContent>
  );
}
