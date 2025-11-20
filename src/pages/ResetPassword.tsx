import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenParam = params.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Erro', description: 'Senhas não conferem.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Requisito', description: 'Senha deve ter ao menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast({ title: 'Senha redefinida', description: 'Agora você pode fazer login.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao redefinir senha.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle>Redefinir Senha</CardTitle>
            <CardDescription>Informe token e nova senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Input id="token" value={token} onChange={e => setToken(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input id="password" type={show1 ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="pr-10" />
                  <button type="button" onClick={() => setShow1(s => !s)} className="absolute inset-y-0 right-2 flex items-center text-gray-500" tabIndex={-1}>
                    {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar Senha</Label>
                <div className="relative">
                  <Input id="confirm" type={show2 ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={loading} className="pr-10" />
                  <button type="button" onClick={() => setShow2(s => !s)} className="absolute inset-y-0 right-2 flex items-center text-gray-500" tabIndex={-1}>
                    {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redefinindo...</> : <><Lock className="h-4 w-4 mr-2" />Redefinir Senha</>}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}>Voltar ao Login</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}