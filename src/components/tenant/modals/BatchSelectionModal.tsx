import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, Package } from 'lucide-react';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface Batch {
  id: string;
  batchNumber: string;
  manufactureDate?: string | null;
  expirationDate: string;
  quantity: number;
  productId: string;
}

interface BatchSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (batch: Batch, quantity: number) => void;
  productId: string;
  productName: string;
  isControlled: boolean;
  maxQuantity?: number;
}

export default function BatchSelectionModal({
  open,
  onClose,
  onSelect,
  productId,
  productName,
  isControlled,
  maxQuantity,
}: BatchSelectionModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open && productId) {
      loadBatches();
    }
  }, [open, productId]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/products/${productId}/batches`);
      
      // Filtrar apenas lotes com estoque disponível e não vencidos
      const availableBatches = (response.data.batches || []).filter(
        (batch: Batch) => batch.quantity > 0 && new Date(batch.expirationDate) > new Date()
      );
      
      // Ordenar por data de vencimento (FEFO - First Expired, First Out)
      availableBatches.sort((a: Batch, b: Batch) => 
        new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
      );
      
      setBatches(availableBatches);
      
      if (availableBatches.length === 0) {
        toast({
          title: 'Nenhum lote disponível',
          description: 'Não há lotes com estoque para este produto.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar lotes',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setQuantity(Math.min(1, batch.quantity, maxQuantity || Infinity));
  };

  const handleConfirm = () => {
    if (!selectedBatch) {
      toast({
        title: 'Selecione um lote',
        description: 'É necessário selecionar um lote para produtos controlados.',
        variant: 'destructive',
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'A quantidade deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (quantity > selectedBatch.quantity) {
      toast({
        title: 'Quantidade insuficiente',
        description: `Apenas ${selectedBatch.quantity} unidades disponíveis neste lote.`,
        variant: 'destructive',
      });
      return;
    }

    if (maxQuantity && quantity > maxQuantity) {
      toast({
        title: 'Quantidade excedida',
        description: `Quantidade máxima permitida: ${maxQuantity}`,
        variant: 'destructive',
      });
      return;
    }

    onSelect(selectedBatch, quantity);
    onClose();
    setSelectedBatch(null);
    setQuantity(1);
  };

  const handleCancel = () => {
    onClose();
    setSelectedBatch(null);
    setQuantity(1);
  };

  const isExpiringSoon = (expirationDate: string) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expirationDate) <= thirtyDaysFromNow;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleção de Lote - {productName}</DialogTitle>
          <DialogDescription>
            {isControlled && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-orange-800">
                  <strong>Produto Controlado (RDC 430):</strong> Obrigatório selecionar lote específico para rastreabilidade.
                </span>
              </div>
            )}
            Selecione o lote a ser utilizado nesta operação. Os lotes são ordenados por data de vencimento (FEFO).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Nenhum lote disponível para este produto</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seleção</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Fabricação</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const expiringSoon = isExpiringSoon(batch.expirationDate);
                    const isSelected = selectedBatch?.id === batch.id;

                    return (
                      <TableRow
                        key={batch.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                        onClick={() => handleSelectBatch(batch)}
                      >
                        <TableCell>
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleSelectBatch(batch)}
                            className="w-4 h-4 text-blue-600"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{batch.batchNumber}</span>
                            {expiringSoon && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Vence em breve
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {batch.manufactureDate ? formatDate(batch.manufactureDate) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            <span className={expiringSoon ? 'text-yellow-700 font-medium' : ''}>
                              {formatDate(batch.expirationDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            <Package className="h-3 w-3 mr-1" />
                            {batch.quantity} un.
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {selectedBatch && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">Lote Selecionado</h4>
                      <p className="text-sm text-blue-700">
                        {selectedBatch.batchNumber} • Validade: {formatDate(selectedBatch.expirationDate)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {selectedBatch.quantity} un. disponíveis
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade a retirar</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={Math.min(selectedBatch.quantity, maxQuantity || Infinity)}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuantity(
                            Math.min(
                              Math.max(1, val),
                              selectedBatch.quantity,
                              maxQuantity || Infinity
                            )
                          );
                        }}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setQuantity(
                            Math.min(
                              quantity + 1,
                              selectedBatch.quantity,
                              maxQuantity || Infinity
                            )
                          )
                        }
                        disabled={
                          quantity >= selectedBatch.quantity ||
                          (maxQuantity && quantity >= maxQuantity)
                        }
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Máximo: {Math.min(selectedBatch.quantity, maxQuantity || Infinity)} unidades
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedBatch || loading}>
            Confirmar Seleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
