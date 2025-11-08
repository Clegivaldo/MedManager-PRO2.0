import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Shield, Thermometer, Calendar, Package, Barcode, Tag, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  anvisa: string;
  batch: string;
  expiry: string;
  stock: number;
  price: number;
  controlled: boolean;
  temperature: string;
}

interface ProductDetailsModalProps {
  product: Product | null;
}

export default function ProductDetailsModal({ product }: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary"/>
            {product.name}
        </DialogTitle>
        <DialogDescription>Detalhes completos do produto e informações de conformidade.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        <div className="space-y-4">
            <InfoItem icon={Barcode} label="Código do Produto" value={product.id} />
            <InfoItem icon={Tag} label="Categoria" value={product.category} />
            <InfoItem icon={Barcode} label="Lote" value={product.batch} />
            <InfoItem icon={DollarSign} label="Preço" value={`R$ ${product.price.toFixed(2)}`} />
        </div>
        <div className="space-y-4">
            <InfoItem icon={Shield} label="Registro ANVISA" value={product.anvisa} />
            <InfoItem icon={Calendar} label="Validade" value={product.expiry} />
            <InfoItem icon={Thermometer} label="Armazenamento" value={product.temperature} />
             <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><Shield className="h-4 w-4"/>Controle Especial</Label>
                {product.controlled ? <Badge variant="destructive">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
            </div>
        </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div>
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><Icon className="h-4 w-4"/>{label}</Label>
        <p className="font-semibold">{value}</p>
    </div>
)
