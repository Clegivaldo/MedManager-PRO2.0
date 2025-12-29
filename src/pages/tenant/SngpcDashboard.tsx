import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface SngpcConfig {
  tenantId: string;
  autoSyncEnabled: boolean;
  syncInterval: number;
  apiUrl?: string;
  lastSyncAt?: string;
  nextSyncAt?: string;
  status?: 'idle' | 'syncing' | 'success' | 'error';
}

interface SyncHistory {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  itemsSynced: number;
  errorMessage?: string;
  duration: number; // em ms
}

export default function SngpcDashboard() {
  const { toast } = useToast();

  const [config, setConfig] = useState<SngpcConfig | null>(null);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedSync, setExpandedSync] = useState<string | null>(null);

  // Carregar configuração do SNGPC
  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sngpc/config');
      if (response.data?.success) {
        setConfig(response.data.config || response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configuração SNGPC',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar histórico de sincronizações
  const loadHistory = async () => {
    try {
      const response = await api.get('/sngpc/history');
      if (response.data?.success) {
        setHistory(response.data.items || response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  useEffect(() => {
    loadConfig();
    loadHistory();

    // Recarregar a cada 30 segundos
    const interval = setInterval(() => {
      loadConfig();
      loadHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Habilitar auto-sync
  const handleEnableAutoSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/sngpc/enable');
      if (response.data?.success) {
        setConfig(response.data.config || response.data.data);
        toast({
          title: 'Sucesso',
          description: 'Auto-sync SNGPC habilitado',
          variant: 'default'
        });
        await loadConfig();
      }
    } catch (error) {
      console.error('Erro ao habilitar auto-sync:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao habilitar auto-sync',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Desabilitar auto-sync
  const handleDisableAutoSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/sngpc/disable');
      if (response.data?.success) {
        setConfig(response.data.config || response.data.data);
        toast({
          title: 'Sucesso',
          description: 'Auto-sync SNGPC desabilitado',
          variant: 'default'
        });
        await loadConfig();
      }
    } catch (error) {
      console.error('Erro ao desabilitar auto-sync:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao desabilitar auto-sync',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Fazer sync manual
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/sngpc/sync');
      if (response.data?.success) {
        const itemsSynced = response.data.itemsSynced || response.data.data?.itemsSynced || 0;
        toast({
          title: 'Sucesso',
          description: `${itemsSynced} itens sincronizados`,
          variant: 'default'
        });
        await loadConfig();
        await loadHistory();
      }
    } catch (error) {
      console.error('Erro ao fazer sync:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao sincronizar',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'success': 'bg-green-100 text-green-800',
      'error': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'syncing': 'bg-blue-100 text-blue-800',
      'idle': 'bg-gray-100 text-gray-800',
    };
    return variants[status] || variants.idle;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard SNGPC/SNCM</h1>
        <p className="text-gray-600 mt-2">Rastreabilidade de medicamentos controlados</p>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Status do Sistema
          </CardTitle>
          <CardDescription>Informações de sincronização SNGPC/SNCM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config && (
            <>
              {/* Auto-Sync Toggle */}
              <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Auto-sincronização</p>
                  <p className="text-sm text-gray-600">
                    {config.autoSyncEnabled ? '✅ Habilitada' : '❌ Desabilitada (padrão)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {config.autoSyncEnabled ? (
                    <Button
                      variant="outline"
                      onClick={handleDisableAutoSync}
                      disabled={syncing}
                      className="gap-2"
                    >
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Desabilitar
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnableAutoSync}
                      disabled={syncing}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Habilitar
                    </Button>
                  )}
                </div>
              </div>

              {/* Sync Info */}
              <div className="grid grid-cols-3 gap-4">
                {/* Último Sync */}
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-1">Última Sincronização</p>
                  <p className="font-medium">
                    {config.lastSyncAt
                      ? format(new Date(config.lastSyncAt), "dd 'de' MMMM, HH:mm", { locale: ptBR })
                      : 'Nunca'
                    }
                  </p>
                </div>

                {/* Próximo Sync */}
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-1">Próxima Sincronização</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {config.nextSyncAt
                      ? format(new Date(config.nextSyncAt), "dd 'de' MMMM, HH:mm", { locale: ptBR })
                      : 'Aguardando'
                    }
                  </p>
                </div>

                {/* Intervalo */}
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-1">Intervalo de Sync</p>
                  <p className="font-medium">{config.syncInterval} minutos</p>
                </div>
              </div>

              {/* Manual Sync Button */}
              <Button
                onClick={handleManualSync}
                disabled={syncing}
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar Agora
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Sincronizações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas sincronizações SNGPC/SNCM</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sincronização realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((sync) => (
                <div
                  key={sync.id}
                  className="bg-gray-50 border rounded-lg p-4 hover:bg-gray-100 transition"
                >
                  {/* Cabeçalho do Item */}
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedSync(expandedSync === sync.id ? null : sync.id)}>
                    <div className="flex items-center gap-3 flex-1">
                      {sync.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {sync.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                      {sync.status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}

                      <div className="flex-1">
                        <p className="font-medium">
                          {format(new Date(sync.timestamp), "dd 'de' MMMM, HH:mm:ss", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {sync.itemsSynced} itens • {sync.duration}ms
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(sync.status)}>
                        {sync.status === 'success' && 'Sucesso'}
                        {sync.status === 'error' && 'Erro'}
                        {sync.status === 'pending' && 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {expandedSync === sync.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {sync.errorMessage && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm font-medium text-red-900">Mensagem de Erro:</p>
                          <p className="text-sm text-red-800 font-mono mt-1">{sync.errorMessage}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">ID da Sincronização:</p>
                          <p className="font-mono text-xs">{sync.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duração:</p>
                          <p className="font-medium">{sync.duration}ms</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Informações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            • <strong>Auto-sincronização padrão:</strong> Desabilitada (configure manualmente)
          </p>
          <p>
            • <strong>Intervalo de sincronização:</strong> {config?.syncInterval || 5} minutos
          </p>
          <p>
            • <strong>Rastreabilidade:</strong> SNGPC para medicamentos controlados, SNCM para produtos rastreáveis
          </p>
          <p>
            • <strong>Modo manual:</strong> Use "Sincronizar Agora" para forçar sincronização imediata
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
