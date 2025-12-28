import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Package } from 'lucide-react';
import { Quote } from '@/services/quote.service';

interface QuoteDetailsModalProps {
  quote: Quote | null;
}

export default function QuoteDetailsModal({ quote }: QuoteDetailsModalProps) {
  // Calcular total real dos itens
  const total = quote?.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || quote?.totalAmount || 0;

  return (
    <DialogContent className="max-w-3xl">
      {quote ? (
        <>
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento {quote.quoteNumber}</DialogTitle>
            <DialogDescription>
              Visualizando informações do orçamento para <span className="font-bold">{quote.customer?.companyName || quote.customer?.tradeName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <InfoItem 
                  icon={User} 
                  label="Cliente" 
                  value={quote.customer?.companyName || quote.customer?.tradeName || 'N/A'} 
                />
                <InfoItem 
                  icon={Calendar} 
                  label="Data de Emissão" 
                  value={new Date(quote.createdAt).toLocaleDateString('pt-BR')} 
                />
                <InfoItem 
                  icon={Calendar} 
                  label="Validade" 
                  value={new Date(quote.validUntil).toLocaleDateString('pt-BR')} 
                />
            </div>
            <Separator />
            <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5"/> Itens do Orçamento
                </h3>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.items && quote.items.length > 0 ? (
                              quote.items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.product?.name || 'Produto'}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                      R$ {item.unitPrice.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      R$ {item.totalPrice.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Nenhum item encontrado.
                                </TableCell>
                              </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
          </div>
        </>
      ) : (
        <div className="p-6 text-center text-muted-foreground">
          Carregando detalhes do orçamento...
        </div>
      )}
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <p className="font-semibold">{value}</p>
    </div>
)
