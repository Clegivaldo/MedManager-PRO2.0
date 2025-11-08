import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function NewTransactionModal() {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
        <DialogDescription>Adicione uma nova receita ou despesa ao seu fluxo de caixa.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="transaction-type">Tipo de Lançamento</Label>
          <Select>
            <SelectTrigger id="transaction-type">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" placeholder="Ex: Pagamento de fornecedor, Venda balcão" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input id="value" type="number" placeholder="0,00" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="due-date">Data de Vencimento/Pagamento</Label>
                <Input id="due-date" type="date" />
            </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
           <Select>
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="fornecedores">Fornecedores</SelectItem>
              <SelectItem value="salarios">Salários</SelectItem>
              <SelectItem value="impostos">Impostos</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Adicionar Lançamento</Button>
      </DialogFooter>
    </DialogContent>
  );
}
