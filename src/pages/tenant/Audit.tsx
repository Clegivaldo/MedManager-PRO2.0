import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield, Search, Calendar, ChevronLeft, ChevronRight,
  RefreshCw, Loader2, Eye, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import auditService, { type AuditLog } from '@/services/audit.service';
import { getErrorMessage } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const OPERATIONS = [
  { value: 'CREATE', label: 'Criação', color: 'bg-green-100 text-green-800' },
  { value: 'UPDATE', label: 'Atualização', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELETE', label: 'Exclusão', color: 'bg-red-100 text-red-800' },
  { value: 'LOGIN', label: 'Login', color: 'bg-purple-100 text-purple-800' },
  { value: 'LOGOUT', label: 'Logout', color: 'bg-gray-100 text-gray-800' },
];

const TABLES = [
  'User',
  'Product',
  'Invoice',
  'Customer',
  'Supplier',
  'Stock',
  'TenantSettings',
];

export default function Audit() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [page, userFilter, tableFilter, operationFilter, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await auditService.listLogs({
        page,
        limit: 20,
        userId: userFilter || undefined,
        tableName: tableFilter || undefined,
        operation: operationFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setLogs(response.logs);
      setTotal(response.total);
      setTotalPages(Math.ceil(response.total / 20));
    } catch (error) {
      toast({
        title: 'Erro ao carregar logs',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOperationBadge = (operation: string) => {
    const op = OPERATIONS.find(o => o.value === operation);
    if (!op) {
      return <Badge variant="outline">{operation}</Badge>;
    }
    return <Badge className={op.color}>{op.label}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const clearFilters = () => {
    setUserFilter('');
    setTableFilter('');
    setOperationFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Auditoria do Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize todas as ações realizadas no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>{total} registros encontrados</CardDescription>
            </div>
            <Button onClick={loadLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário..."
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={tableFilter} onValueChange={(value) => {
              setTableFilter(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as Tabelas</SelectItem>
                {TABLES.map(table => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operationFilter} onValueChange={(value) => {
              setOperationFilter(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as Operações</SelectItem>
                {OPERATIONS.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                placeholder="Data inicial"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                placeholder="Data final"
              />
            </div>
          </div>

          {(userFilter || tableFilter || operationFilter || startDate || endDate) && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum log de auditoria encontrado</p>
                    {(userFilter || tableFilter || operationFilter || startDate || endDate) && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Limpar filtros
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.userName || 'Sistema'}</p>
                        {log.ipAddress && (
                          <p className="text-xs text-muted-foreground">{log.ipAddress}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.tableName}</Badge>
                    </TableCell>
                    <TableCell>{getOperationBadge(log.operation)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.recordId ? log.recordId.substring(0, 8) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetails(log)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total} logs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
            <DialogDescription>
              Informações completas sobre a ação realizada
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                  <p className="font-mono">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                  <p>{selectedLog.userName || 'Sistema'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tabela</p>
                  <Badge variant="outline">{selectedLog.tableName}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Operação</p>
                  {getOperationBadge(selectedLog.operation)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID do Registro</p>
                  <p className="font-mono text-sm">{selectedLog.recordId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">User Agent</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.oldData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Dados Anteriores</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Novos Dados</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
