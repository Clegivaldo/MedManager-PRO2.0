import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
}

interface EditTenantModalProps {
  tenant: Tenant | null;
  mode: 'create' | 'edit';
}

export default function EditTenantModal({ tenant, mode }: EditTenantModalProps) {
  const title = mode === 'edit' ? 'Editar Tenant' : 'Adicionar Novo Tenant';
  const description = mode === 'edit' ? `Editando informações para ${tenant?.name}.` : 'Preencha os dados do novo tenant.';

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Nome do Tenant</Label>
          <Input id="tenant-name" defaultValue={tenant?.name} placeholder="Ex: Farmácia Central LTDA" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-cnpj">CNPJ</Label>
          <Input id="tenant-cnpj" defaultValue={tenant?.cnpj} placeholder="00.000.000/0000-00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-plan">Plano</Label>
          <Select defaultValue={tenant?.plan}>
            <SelectTrigger id="tenant-plan">
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Básico">Básico</SelectItem>
              <SelectItem value="Profissional">Profissional</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
