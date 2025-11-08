import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function StockMovementModal() {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
        <DialogDescription>Registre entradas, saídas ou ajustes de produtos.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="movement-type" className="text-right">Tipo</Label>
          <Select>
            <SelectTrigger id="movement-type" className="col-span-3">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="product" className="text-right">Produto</Label>
          <Select>
            <SelectTrigger id="product" className="col-span-3">
              <SelectValue placeholder="Selecione o produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prd-001">Paracetamol 500mg</SelectItem>
              <SelectItem value="prd-002">Amoxicilina 875mg</SelectItem>
              <SelectItem value="prd-003">Insulina NPH</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="quantity" className="text-right">Quantidade</Label>
          <Input id="quantity" type="number" className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="batch" className="text-right">Lote</Label>
          <Input id="batch" placeholder="Lote do produto (se aplicável)" className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="reason" className="text-right mt-2">Motivo/Obs.</Label>
          <Textarea id="reason" placeholder="Motivo do ajuste ou observação" className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Registrar Movimentação</Button>
      </DialogFooter>
    </DialogContent>
  );
}
