import { DANFEData } from './nfe.service.js';
import { generateDanfePdf } from '../utils/danfePdf.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export class DanfeService {
  async generate(data: DANFEData): Promise<Buffer> {
    try {
      if (!data.nfe || data.nfe.status !== 'authorized') {
        throw new AppError('NF-e deve estar autorizada para gerar DANFE', 400);
      }

      logger.info('Gerando DANFE PDF', { invoiceId: data.id, accessKey: data.nfe.accessKey });
      const pdf = await generateDanfePdf(data);
      logger.info('DANFE gerado', { invoiceId: data.id, bytes: pdf.length });
      return pdf;
    } catch (err) {
      logger.error('Falha ao gerar DANFE', { invoiceId: data.id, error: (err as Error).message });
      if (err instanceof AppError) throw err;
      throw new AppError('Erro interno ao gerar DANFE', 500);
    }
  }
}

export const danfeService = new DanfeService();
