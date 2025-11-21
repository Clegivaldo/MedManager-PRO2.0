import { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import superadminService from '@/services/superadmin.service';

interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  subscriptionEnd?: string;
  subscriptionStatus?: string;
  metadata?: any;
}

interface EditTenantModalProps {
  tenant: Tenant | null;
  mode: 'create' | 'edit';
  onSaved?: () => void;
  onClose?: () => void;
}

export default function EditTenantModal({ tenant, mode, onSaved, onClose }: EditTenantModalProps) {
  const title = mode === 'edit' ? 'Editar Tenant' : 'Adicionar Novo Tenant';
  const description = mode === 'edit' ? `Editando informações para ${tenant?.name}.` : 'Preencha os dados do novo tenant.';

  const { toast } = useToast();
  const [name, setName] = useState(tenant?.name || '');
  const [cnpj, setCnpj] = useState(tenant?.cnpj || '');
  const [plan, setPlan] = useState(tenant?.plan || '');
  const [subscriptionEnd, setSubscriptionEnd] = useState(tenant?.subscriptionEnd ? new Date(tenant.subscriptionEnd).toISOString().split('T')[0] : '');
  const [email, setEmail] = useState(tenant?.metadata?.email || '');
  const [phone, setPhone] = useState(tenant?.metadata?.phone || '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    try {
      setSaving(true);
      const metadata = { email, phone };
      if (mode === 'create') {
        await superadminService.createTenant({ name, cnpj, plan, email, phone });
        toast({ title: 'Tenant criado com sucesso' });
      } else if (tenant?.id) {
        await superadminService.updateTenant(tenant.id, { name, cnpj, plan, metadata });
        toast({ title: 'Tenant atualizado com sucesso' });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Nome do Tenant</Label>
          <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Farmácia Central LTDA" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-cnpj">CNPJ</Label>
          <Input id="tenant-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-plan">Plano</Label>
          <Select value={plan} onValueChange={setPlan}>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-email">E-mail</Label>
            <Input id="tenant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-phone">Telefone</Label>
            <Input id="tenant-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>
        {mode === 'edit' && tenant?.subscriptionEnd && (
          <div className="space-y-2">
            <Label htmlFor="tenant-subscription">Validade da Licença</Label>
            <Input id="tenant-subscription" type="date" value={subscriptionEnd} onChange={(e) => setSubscriptionEnd(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Use a página de Assinaturas para renovar/alterar a validade
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
