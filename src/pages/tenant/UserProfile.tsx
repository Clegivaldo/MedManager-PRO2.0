import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import api, { getErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import {
  User,
  Mail,
  Lock,
  Shield,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
}

const UserProfile = () => {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<'disabled' | 'setup' | 'enabled'>('disabled');

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
      });
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
      setAvatarPreview(user.avatarUrl || null);
      setTwoFactorStep(user.twoFactorEnabled ? 'enabled' : 'disabled');
    }
  }, [user]);

  // Avatar dropzone
  const onDropAvatar = (accepted: File[]) => {
    if (accepted && accepted.length > 0) {
      const file = accepted[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps: getRootAvatarProps, getInputProps: getAvatarInputProps, isDragActive: isDragActiveAvatar } = useDropzone({
    onDrop: onDropAvatar,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    maxSize: 2097152, // 2MB
  });

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const updateData: any = {
        name: formData.name,
      };

      await api.put('/api/v1/users/profile', updateData);

      // Upload avatar se houver arquivo selecionado
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        const response = await api.post('/api/v1/users/avatar', fd, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        
        // Atualizar preview com URL retornada
        if (response.data.avatarUrl) {
          setAvatarPreview(response.data.avatarUrl);
          setProfile(prev => prev ? { ...prev, avatarUrl: response.data.avatarUrl } : null);
        }
        setAvatarFile(null);
      }

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });

      await refreshUser();
    } catch (error) {
      toast({
        title: 'Erro ao salvar perfil',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/v1/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast({
        title: 'Erro ao alterar senha',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/v1/users/2fa/setup');
      // Aqui você mostraria um QR code ou instruções
      toast({
        title: 'Autenticação de dois fatores',
        description: 'Escaneie o código QR com seu aplicativo autenticador.',
      });
      setTwoFactorStep('setup');
    } catch (error) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setLoading(true);
      await api.post('/api/v1/users/2fa/verify', { code: twoFactorCode });
      toast({
        title: 'Autenticação de dois fatores ativada',
        description: 'Sua conta agora está protegida com 2FA.',
      });
      setTwoFactorStep('enabled');
      setTwoFactorCode('');
      await refreshUser();
    } catch (error) {
      toast({
        title: 'Código inválido',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setLoading(true);
      await api.post('/api/v1/users/2fa/disable');
      toast({
        title: 'Autenticação de dois fatores desativada',
        description: 'Você pode reativar quando desejar.',
      });
      setTwoFactorStep('disabled');
      await refreshUser();
    } catch (error) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="p-6">Carregando perfil...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground">
          Gerenciar informações pessoais, senha e segurança
        </p>
      </div>

      <div className="grid gap-6">
        {/* Foto de Perfil */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Clique na imagem para alterar sua foto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-6">
              <div
                {...getRootAvatarProps()}
                className="cursor-pointer relative group"
              >
                <input {...getAvatarInputProps()} />
                <Avatar className="h-32 w-32 border-2 border-muted">
                  <AvatarImage src={avatarPreview || profile?.avatarUrl} alt={profile?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </div>

              {avatarFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">
                    ✓ {avatarFile.name} selecionado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(avatarFile.size / 1024).toFixed(2)} KB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(profile?.avatarUrl || null);
                    }}
                    className="mt-2"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (máx. 2MB)</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seus dados básicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                E-mail não pode ser alterado
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={loading}>
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Atualize sua senha regularmente para manter sua conta segura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Digite sua senha atual"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Repita a nova senha"
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword}>
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Autenticação de Dois Fatores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Autenticação de Dois Fatores (2FA)
            </CardTitle>
            <CardDescription>
              Adicione uma camada extra de segurança à sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorStep === 'disabled' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Autenticação de dois fatores está desativada. Ative para maior segurança.
                </AlertDescription>
              </Alert>
            )}

            {twoFactorStep === 'enabled' && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Autenticação de dois fatores está ativa. Você precisará de um código do seu aplicativo autenticador ao fazer login.
                </AlertDescription>
              </Alert>
            )}

            {twoFactorStep === 'setup' && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Escaneie o código QR com seu aplicativo autenticador (Google Authenticator, Authy, Microsoft Authenticator, etc).
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Código de Verificação</Label>
                  <Input
                    id="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTwoFactorStep('disabled')} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleVerify2FA} disabled={loading || twoFactorCode.length !== 6} className="flex-1">
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            {twoFactorStep !== 'setup' && (
              <div className="flex justify-end">
                {twoFactorStep === 'disabled' ? (
                  <Button onClick={handleEnable2FA} disabled={loading}>
                    Ativar 2FA
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
                    Desativar 2FA
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID da Conta</p>
                <p className="font-mono text-sm">{profile.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p>{profile.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status 2FA</p>
                {twoFactorStep === 'enabled' ? (
                  <Badge className="mt-1">Ativo</Badge>
                ) : (
                  <Badge variant="secondary" className="mt-1">Inativo</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
