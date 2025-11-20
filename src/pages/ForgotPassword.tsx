import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset?.(email);
      toast({ title: 'Solicitação enviada', description: 'Se o email existir, enviaremos instruções.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao solicitar reset.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>Informe seu email para receber instruções</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="email" type="email" className="pl-8" placeholder="seu@email.com" required disabled={loading} value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : 'Enviar Link de Recuperação'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}>Voltar ao Login</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}