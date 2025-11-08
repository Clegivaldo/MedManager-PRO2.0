import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, ShieldCheck, UserPlus, Mail } from 'lucide-react';
import PermissionsManager from '@/components/tenant/PermissionsManager';

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const users = [
    { id: 'USR-001', name: 'Dr. João Silva', email: 'joao.silva@farmaciacentral.com.br', role: 'Administrador', status: 'active', avatar: '/avatars/user.jpg' },
    { id: 'USR-002', name: 'Ana Costa', email: 'ana.costa@farmaciacentral.com.br', role: 'Farmacêutico', status: 'active', avatar: '/avatars/01.png' },
    { id: 'USR-003', name: 'Carlos Santos', email: 'carlos.santos@farmaciacentral.com.br', role: 'Estoquista', status: 'active', avatar: '/avatars/02.png' },
    { id: 'USR-004', name: 'Mariana Oliveira', email: 'mariana.o@farmaciacentral.com.br', role: 'Vendedor', status: 'inactive', avatar: '/avatars/03.png' },
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Usuários e Permissões</h1>
          <p className="text-muted-foreground mt-1">Gerencie os acessos da sua equipe ao sistema</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para um novo membro da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nome Completo</Label>
                <Input id="user-name" placeholder="Nome do colaborador" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" type="email" placeholder="email@colaborador.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Cargo / Função</Label>
                <Input id="user-role" placeholder="Ex: Farmacêutico Responsável" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button><Mail className="mr-2 h-4 w-4" />Enviar Convite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>{filteredUsers.length} usuários encontrados</CardDescription>
            </div>
            <div className="w-full max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, email ou cargo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'secondary' : 'outline'} className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Gerenciar Permissões
                        </Button>
                      </DialogTrigger>
                      <PermissionsManager user={user} />
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
