import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { DANFEData } from '../services/nfe.service.js';

export async function generateDanfePdf(data: DANFEData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 20 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const accessKey: string = data.nfe?.accessKey || 'SEM-CHAVE';
  const protocol: string = data.nfe?.protocolNumber || 'SEM-PROTOCOLO';
  const ambiente = process.env.NODE_ENV === 'production' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO';
  const isSimulation = !!(data.nfe?.protocolNumber?.startsWith('SIM') || data.nfe?.sefazResponse?.simulation);

  // Header
  doc.fontSize(14).text('DANFE - Documento Auxiliar da Nota Fiscal Eletrônica', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).text(`Ambiente: ${ambiente}`, { align: 'center' });
  doc.moveDown(1);

  // Watermark for simulation mode
  if (isSimulation) {
    doc.save();
    doc.fontSize(90).fillColor('#e3342f').opacity(0.15).rotate(45, { origin: [300, 400] });
    doc.text('SIMULACAO', 60, 200, { width: 500, align: 'center' });
    doc.rotate(-45, { origin: [300, 400] }); // reset rotation
    doc.opacity(1).fillColor('black');
    doc.restore();
  }

  // Emitente
  doc.fontSize(11).text('Emitente', { underline: true });
  doc.fontSize(9)
    .text(`Nome: ${data.tenant.name}`)
    .text(`CNPJ: ${data.tenant.cnpj}`)
    .text(`IE: ${data.tenant.stateRegistration || 'N/D'}`);
  doc.moveDown(0.5);

  // Destinatário
  doc.fontSize(11).text('Destinatário', { underline: true });
  doc.fontSize(9)
    .text(`Nome: ${data.customer.name}`)
    .text(`CNPJ/CPF: ${data.customer.cnpjCpf}`);
  doc.moveDown(0.5);

  // NF-e info
  doc.fontSize(11).text('NF-e', { underline: true });
  doc.fontSize(9)
    .text(`Número: ${data.invoice.invoiceNumber}`)
    .text(`Chave de Acesso: ${accessKey}`)
    .text(`Protocolo: ${protocol}`)
    .text(`Data Emissão: ${data.invoice.createdAt.toLocaleString('pt-BR')}`);
  doc.moveDown(0.5);

  // Barcode (Code 128 of access key) & QRCode (if available)
  try {
    const barcodePng = await bwipjs.toBuffer({ bcid: 'code128', text: accessKey, scale: 2, height: 12, includetext: false });
    doc.image(barcodePng, { fit: [250, 50] });
  } catch {}
  if (data.nfe?.accessKey) {
    try {
      const qr = await QRCode.toBuffer(data.nfe.qrCodeUrl || `https://www.nfe.fazenda.gov.br/portal/consultar.aspx?chave=${accessKey}`);
      doc.image(qr, 400, doc.y - 50, { fit: [120, 120] });
    } catch {}
  }
  doc.moveDown(2);

  // Itens
  doc.fontSize(11).text('Itens', { underline: true });
  doc.fontSize(8);
  const colWidths = { idx: 25, desc: 210, qty: 40, un: 30, vUnit: 60, vTotal: 60 };
  const startY = doc.y;
  doc.text('#', 20, startY, { width: colWidths.idx });
  doc.text('Descrição', 20 + colWidths.idx, startY, { width: colWidths.desc });
  doc.text('Qtde', 20 + colWidths.idx + colWidths.desc, startY, { width: colWidths.qty });
  doc.text('Un', 20 + colWidths.idx + colWidths.desc + colWidths.qty, startY, { width: colWidths.un });
  doc.text('V.Unit', 20 + colWidths.idx + colWidths.desc + colWidths.qty + colWidths.un, startY, { width: colWidths.vUnit });
  doc.text('V.Total', 20 + colWidths.idx + colWidths.desc + colWidths.qty + colWidths.un + colWidths.vUnit, startY, { width: colWidths.vTotal });
  doc.moveDown(0.5);
  doc.moveTo(20, doc.y).lineTo(560, doc.y).stroke();

  data.items.forEach((item, i) => {
    const y = doc.y;
    doc.text(String(i + 1), 20, y, { width: colWidths.idx });
    doc.text(item.product.name, 20 + colWidths.idx, y, { width: colWidths.desc });
    doc.text(item.quantity.toFixed(2), 20 + colWidths.idx + colWidths.desc, y, { width: colWidths.qty });
    doc.text(item.product.unit, 20 + colWidths.idx + colWidths.desc + colWidths.qty, y, { width: colWidths.un });
    doc.text(item.unitPrice.toFixed(2), 20 + colWidths.idx + colWidths.desc + colWidths.qty + colWidths.un, y, { width: colWidths.vUnit });
    doc.text(item.total.toFixed(2), 20 + colWidths.idx + colWidths.desc + colWidths.qty + colWidths.un + colWidths.vUnit, y, { width: colWidths.vTotal });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.5);
  doc.moveTo(20, doc.y).lineTo(560, doc.y).stroke();

  // Totais
  doc.fontSize(10).text(`Subtotal: R$ ${data.invoice.subtotal.toFixed(2)}`);
  doc.text(`Desconto: R$ ${data.invoice.discount.toFixed(2)}`);
  doc.text(`Total: R$ ${data.invoice.total.toFixed(2)}`);
  doc.moveDown(1);

  doc.fontSize(7).text('Consulta de autenticidade: www.nfe.fazenda.gov.br/portal', { align: 'center' });
  doc.fontSize(7).text(`Chave de acesso: ${accessKey}`, { align: 'center' });
  doc.fontSize(7).text('Documento gerado pelo MedManager 2.0', { align: 'center' });

  doc.end();
  return endPromise;
}
