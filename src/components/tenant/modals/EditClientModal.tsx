import { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import customerService, { Customer } from '@/services/customer.service';

interface EditClientModalProps {
  client: Customer | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

export default function EditClientModal({ client, mode, onSuccess }: EditClientModalProps) {
  const title = mode === 'edit' ? 'Editar Cliente' : 'Cadastrar Novo Cliente';
  const description = mode === 'edit' ? `Editando dados de ${client?.companyName}.` : 'Preencha os dados para adicionar um novo cliente.';
  
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [customerType, setCustomerType] = useState('DISTRIBUTOR');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [creditLimit, setCreditLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (client && mode === 'edit') {
      setCnpjCpf(client.cnpjCpf || '');
      setCompanyName(client.companyName || '');
      setTradeName(client.tradeName || '');
      setCustomerType(client.customerType || 'DISTRIBUTOR');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      if (client.address && typeof client.address === 'object') {
        setAddress(client.address as any);
      }
      setCreditLimit(client.creditLimit ? String(client.creditLimit) : '');
    }
  }, [client, mode]);

  const handleSubmit = async () => {
    // Validações
    if (!cnpjCpf || !companyName || !customerType) {
      toast({
        title: 'Erro',
        description: 'CNPJ/CPF, Razão Social e Tipo de Cliente são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const data = {
        cnpjCpf,
        companyName,
        tradeName: tradeName || companyName,
        customerType,
        email: email || undefined,
        phone: phone || undefined,
        address: address.street ? address : undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      };

      if (mode === 'create') {
        await customerService.create(data);
        toast({
          title: 'Sucesso',
          description: 'Cliente cadastrado com sucesso!',
        });
      } else if (client?.id) {
        await customerService.update(client.id, data);
        toast({
          title: 'Sucesso',
          description: 'Cliente atualizado com sucesso!',
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível salvar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="client-cnpj">CNPJ/CPF *</Label>
          <Input 
            id="client-cnpj" 
            value={cnpjCpf}
            onChange={(e) => setCnpjCpf(e.target.value)}
            placeholder="00.000.000/0000-00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-type">Tipo de Cliente *</Label>
          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger id="client-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISTRIBUTOR">Distribuidor</SelectItem>
              <SelectItem value="PHARMACY">Farmácia</SelectItem>
              <SelectItem value="HOSPITAL">Hospital</SelectItem>
              <SelectItem value="CLINIC">Clínica</SelectItem>
              <SelectItem value="OTHER">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="client-company">Razão Social *</Label>
          <Input 
            id="client-company" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Razão Social da Empresa" 
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="client-trade">Nome Fantasia</Label>
          <Input 
            id="client-trade" 
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Nome Fantasia (opcional)" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-email">Email</Label>
          <Input 
            id="client-email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@cliente.com" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-phone">Telefone</Label>
          <Input 
            id="client-phone" 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-credit">Limite de Crédito (R$)</Label>
          <Input 
            id="client-credit" 
            type="number"
            step="0.01"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="0.00" 
          />
        </div>
        
        {/* Endereço */}
        <div className="col-span-2">
          <h3 className="font-semibold mb-3">Endereço (opcional)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="street">Rua</Label>
              <Input 
                id="street" 
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="Rua"  
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input 
                id="number" 
                value={address.number}
                onChange={(e) => setAddress({ ...address, number: e.target.value })}
                placeholder="123" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input 
                id="neighborhood" 
                value={address.neighborhood}
                onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                placeholder="Bairro" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input 
                id="city" 
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="Cidade" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input 
                id="state" 
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input 
                id="zipCode" 
                value={address.zipCode}
                onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                placeholder="00000-000" 
              />
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={loading}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
