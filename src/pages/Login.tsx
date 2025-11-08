import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Building2, Mail, Lock, Users } from 'lucide-react';

export default function Login() {
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '' });
  const [cnpjLogin, setCnpjLogin] = useState({ cnpj: '', password: '' });

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar autenticação por email
    window.location.href = '/dashboard';
  };

  const handleCnpjLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar autenticação por CNPJ
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo e Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MedManager-PRO</h1>
            <p className="text-gray-600 mt-2">Sistema de Gestão Farmacêutica</p>
            <p className="text-sm text-gray-500">Conformidade ANVISA • Multi-tenant • Seguro</p>
          </div>
        </div>

        {/* Formulário de Login */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-gray-800">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Escolha seu método de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="cnpj" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  CNPJ
                </TabsTrigger>
              </TabsList>

              {/* Login por Email */}
              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={emailLogin.email}
                      onChange={(e) => setEmailLogin({...emailLogin, email: e.target.value})}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={emailLogin.password}
                      onChange={(e) => setEmailLogin({...emailLogin, password: e.target.value})}
                      className="h-11"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                    <Lock className="h-4 w-4 mr-2" />
                    Entrar com Email
                  </Button>
                </form>
              </TabsContent>

              {/* Login por CNPJ */}
              <TabsContent value="cnpj">
                <form onSubmit={handleCnpjLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpjLogin.cnpj}
                      onChange={(e) => setCnpjLogin({...cnpjLogin, cnpj: e.target.value})}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj-password">Senha</Label>
                    <Input
                      id="cnpj-password"
                      type="password"
                      placeholder="••••••••"
                      value={cnpjLogin.password}
                      onChange={(e) => setCnpjLogin({...cnpjLogin, password: e.target.value})}
                      className="h-11"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-green-600 hover:bg-green-700">
                    <Users className="h-4 w-4 mr-2" />
                    Entrar como Empresa
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Links Adicionais */}
            <div className="mt-6 text-center space-y-2">
              <a href="#" className="text-sm text-blue-600 hover:underline block">
                Esqueceu sua senha?
              </a>
              <a href="#" className="text-sm text-green-600 hover:underline block">
                Solicitar acesso para nova empresa
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Conformidade com ANVISA RDC 430 • Portaria 344/98</p>
          <p>Sistema certificado para distribuição farmacêutica</p>
        </div>
      </div>
    </div>
  );
}
