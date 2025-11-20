import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Building2, Mail, Lock, Users, Loader2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const navigate = useNavigate();
  const { login, user, requestPasswordReset } = useAuth();
  const { toast } = useToast();
  
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '' });
  const [cnpjLogin, setCnpjLogin] = useState({ cnpj: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showTenantPassword, setShowTenantPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login({ email: emailLogin.email, password: emailLogin.password });
      const role = response.user.role.toUpperCase();
      if (role === 'SUPERADMIN') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCnpjLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login({ cnpj: cnpjLogin.cnpj, email: (cnpjLogin as any).email, password: cnpjLogin.password });
      const role = response.user.role.toUpperCase();
      if (role === 'SUPERADMIN') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = emailLogin.email || (cnpjLogin as any).email || window.prompt('Informe seu email para reset de senha:') || '';
    if (!email) return;
    try {
      await requestPasswordReset?.(email);
      toast({
        title: 'Solicitação enviada',
        description: 'Se o email existir, enviaremos instruções em breve.'
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível solicitar reset de senha.',
        variant: 'destructive'
      });
    }
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
            <p className="text-gray-600 mt-2">Sistema de Gestão para distribuição Farmacêutica</p>
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
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email" className="flex items-center gap-2" disabled={isLoading}>
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="cnpj" className="flex items-center gap-2" disabled={isLoading}>
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
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showEmailPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={emailLogin.password}
                        onChange={(e) => setEmailLogin({...emailLogin, password: e.target.value})}
                        className="h-11 pr-10"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword(p => !p)}
                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Entrar com Email
                      </>
                    )}
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
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj-email">Email</Label>
                    <Input
                      id="cnpj-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={(cnpjLogin as any).email || ''}
                      onChange={(e) => setCnpjLogin({ ...cnpjLogin, ...(cnpjLogin as any), email: e.target.value })}
                      className="h-11"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="cnpj-password"
                        type={showTenantPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={cnpjLogin.password}
                        onChange={(e) => setCnpjLogin({...cnpjLogin, password: e.target.value})}
                        className="h-11 pr-10"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowTenantPassword(p => !p)}
                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showTenantPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Entrar como Empresa
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Links Adicionais */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-blue-600 hover:underline">
                  Esqueceu sua senha?
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 justify-start gap-2"
                  disabled={isLoading}
                  onClick={() => {
                    setEmailLogin({ email: 'admin@medmanager.com.br', password: 'admin123' });
                  }}
                >
                  <KeyRound className="h-4 w-4 text-purple-600" />
                  Usar credenciais SUPERADMIN
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 justify-start gap-2"
                  disabled={isLoading}
                  onClick={() => {
                    setCnpjLogin({
                      ...(cnpjLogin as any),
                      cnpj: '12345678000195',
                      email: 'admin@farmaciademo.com.br',
                      password: 'admin123'
                    });
                  }}
                >
                  <KeyRound className="h-4 w-4 text-green-600" />
                  Usar credenciais Tenant Demo
                </Button>
              </div>
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
