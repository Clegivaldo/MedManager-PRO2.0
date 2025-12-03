export type NFeNormalizedStatus = 'authorized' | 'cancelled' | 'denied' | 'processing' | 'error';

export const NFE_STATUS_MAP: Record<string, { status: NFeNormalizedStatus; description: string }> = {
  // Autorizada
  '100': { status: 'authorized', description: 'Autorizado o uso da NF-e' },
  // Cancelada
  '101': { status: 'cancelled', description: 'Cancelamento de NF-e homologado' },
  '135': { status: 'cancelled', description: 'Evento homologado' },
  '136': { status: 'cancelled', description: 'Evento homologado' },
  // Denegada
  '110': { status: 'denied', description: 'Uso denegado' },
  '205': { status: 'denied', description: 'NF-e denegada' },
  '301': { status: 'denied', description: 'Uso denegado' },
  // Processamento
  '103': { status: 'processing', description: 'Lote recebido com sucesso' },
  '104': { status: 'processing', description: 'Lote processado' },
  '105': { status: 'processing', description: 'Lote em processamento' },
  // Erros comuns (exemplos)
  '204': { status: 'error', description: 'Duplicidade de NF-e' },
  '218': { status: 'error', description: 'NF-e já está cancelada' },
  '217': { status: 'error', description: 'NF-e não consta na base de dados' },
  '999': { status: 'error', description: 'Erro de comunicação com Sefaz' },
};

export function normalizeNFeStatus(code?: string): NFeNormalizedStatus | undefined {
  if (!code) return undefined;
  return NFE_STATUS_MAP[code]?.status;
}
