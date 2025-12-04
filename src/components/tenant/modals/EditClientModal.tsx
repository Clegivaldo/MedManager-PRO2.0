import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Client {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
  phone: string;
}

interface EditClientModalProps {
  client: Client | null;
  mode: 'create' | 'edit';
}

export default function EditClientModal({ client, mode }: EditClientModalProps) {
  const title = mode === 'edit' ? 'Editar Cliente' : 'Cadastrar Novo Cliente';
  const description = mode === 'edit' ? `Editando dados de ${client?.name}.` : 'Preencha os dados para adicionar um novo cliente.';

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="client-name">Nome Fantasia</Label>
          <Input id="client-name" defaultValue={client?.name} placeholder="Nome da farmácia ou drogaria" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-cnpj">CNPJ</Label>
          <Input id="client-cnpj" defaultValue={client?.cnpj} placeholder="00.000.000/0000-00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-ie">Inscrição Estadual</Label>
          <Input id="client-ie" placeholder="Número da Inscrição Estadual" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-email">Email de Contato</Label>
          <Input id="client-email" type="email" defaultValue={client?.contact} placeholder="contato@cliente.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-phone">Telefone</Label>
          <Input id="client-phone" type="tel" defaultValue={client?.phone} placeholder="(00) 00000-0000" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button>Salvar Cliente</Button>
      </DialogFooter>
    </DialogContent>
  );
}
