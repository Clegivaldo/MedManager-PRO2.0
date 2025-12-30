import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import productService, { ProductFormData } from '@/services/product.service';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  onSuccess?: () => void;
}

export default function EditProductModal({ product, mode, onSuccess }: EditProductModalProps) {
  const title = mode === 'edit' ? 'Editar Produto' : 'Cadastrar Novo Produto';
  const description = mode === 'edit' ? `Editando informações para ${product?.name}.` : 'Adicione um novo medicamento ao catálogo.';

  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormData>({
    name: product?.name || '',
    internalCode: product?.id || '',
    anvisaCode: product?.anvisa || '',
    productType: 'COMMON',
    storage: '',
    isControlled: false,
    stripe: 'NONE',
    // Fiscais
    ncm: '',
    cest: '',
    cfop: '5102',
    isActive: true
  });

  const onChange = (key: keyof ProductFormData) => (e: any) => {
    setForm(prev => ({ ...prev, [key]: e?.target ? e.target.value : e }));
  };

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        await productService.create(form);
      } else if (mode === 'edit' && product?.id) {
        await productService.update(product.id, form);
      }
      toast({ title: 'Sucesso', description: 'Produto salvo com sucesso.' });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar produto.', variant: 'destructive' });
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">Nome do Produto</Label>
          <Input id="product-name" value={form.name} onChange={onChange('name')} placeholder="Ex: Paracetamol 500mg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={form.productType} onValueChange={onChange('productType') as any}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COMMON">Comum</SelectItem>
              <SelectItem value="GENERIC">Genérico</SelectItem>
              <SelectItem value="SIMILAR">Similar</SelectItem>
              <SelectItem value="REFERENCE">Referência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="anvisa-code">Registro ANVISA</Label>
          <Input id="anvisa-code" value={form.anvisaCode || ''} onChange={onChange('anvisaCode')} placeholder="MS-1.0573.0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperatura</Label>
          <Input id="temperature" value={form.storage || ''} onChange={onChange('storage')} placeholder="15-30°C" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" placeholder="Descrição detalhada do produto..." />
        </div>
        {/* Campos Fiscais */}
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ncm">NCM</Label>
            <Input id="ncm" value={form.ncm || ''} onChange={onChange('ncm')} placeholder="8 dígitos" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cest">CEST</Label>
            <Input id="cest" value={form.cest || ''} onChange={onChange('cest')} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfop">CFOP</Label>
            <Input id="cfop" value={form.cfop || ''} onChange={onChange('cfop')} placeholder="5102" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSave}>Salvar Produto</Button>
      </DialogFooter>
    </DialogContent>
  );
}
