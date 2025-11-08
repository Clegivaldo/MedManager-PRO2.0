import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, DollarSign, Tag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Transaction {
  id: string;
  client?: string;
  supplier?: string;
  dueDate: string;
  value: number;
  status: string;
}

interface FinancialTransactionDetailsModalProps {
  transaction: Transaction | null;
}

export default function FinancialTransactionDetailsModal({ transaction }: FinancialTransactionDetailsModalProps) {
  if (!transaction) return null;

  const isReceivable = !!transaction.client;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
            {isReceivable ? <ArrowUpCircle className="h-6 w-6 text-green-600"/> : <ArrowDownCircle className="h-6 w-6 text-red-600"/>}
            Detalhes do Lançamento {transaction.id}
        </DialogTitle>
        <DialogDescription>
          Visualizando informações detalhadas do lançamento financeiro.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem icon={User} label={isReceivable ? "Cliente" : "Fornecedor"} value={transaction.client || transaction.supplier || ''} />
            <InfoItem icon={Calendar} label="Data de Vencimento" value={transaction.dueDate} />
            <InfoItem icon={DollarSign} label="Valor" value={`R$ ${transaction.value.toFixed(2)}`} />
            <InfoItem icon={Tag} label="Status" value={transaction.status} />
        </div>
        <Separator />
        <div>
            <h3 className="font-semibold mb-2">Observações</h3>
            <p className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                {isReceivable ? `Fatura referente à venda #${transaction.id.replace('REC', 'VDA')}.` : `Pagamento referente à nota de compra #${transaction.id.replace('PAG', 'NF')}.`}
            </p>
        </div>
      </div>
    </DialogContent>
  );
}

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div>
        <p className="text-muted-foreground flex items-center gap-1 mb-1"><Icon className="h-3 w-3"/>{label}</p>
        <div className="font-semibold">{value}</div>
    </div>
)
