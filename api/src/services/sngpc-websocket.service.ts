/**
 * Dashboard Enhancement: WebSocket Real-time Notifications
 * 
 * Emite eventos em tempo real para o dashboard quando:
 * - Sincronização SNGPC inicia
 * - Sincronização SNGPC completa
 * - Sincronização SNGPC falha
 * - NF-e é gerada
 * - Relatório ANVISA é criado
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

export interface SngpcSyncEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed';
  tenantId: string;
  submissionId?: string;
  timestamp: Date;
  data?: {
    movementsCount?: number;
    duration?: string;
    error?: string;
  };
}

export interface NFeEvent {
  type: 'nfe_generated' | 'nfe_authorized' | 'nfe_failed';
  tenantId: string;
  orderId: string;
  accessKey?: string;
  timestamp: Date;
  data?: {
    number?: string;
    series?: string;
    error?: string;
  };
}

export interface AnvisaReportEvent {
  type: 'report_generated' | 'report_exported';
  tenantId: string;
  reportId: string;
  reportType: string;
  timestamp: Date;
}

export class SngpcWebSocketService {
  private io: SocketIOServer;
  private static instance: SngpcWebSocketService;

  private constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Obtém ou cria instância singleton
   */
  static getInstance(io?: SocketIOServer): SngpcWebSocketService {
    if (!SngpcWebSocketService.instance && io) {
      SngpcWebSocketService.instance = new SngpcWebSocketService(io);
    }
    return SngpcWebSocketService.instance;
  }

  /**
   * Configura handlers de eventos
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('🔌 WebSocket cliente conectado', {
        socketId: socket.id
      });

      // Cliente se inscreve no room do seu tenant
      socket.on('join_tenant', (tenantId: string) => {
        socket.join(`tenant:${tenantId}`);
        logger.info('✅ Cliente inscrito no tenant', {
          socketId: socket.id,
          tenantId
        });
      });

      // Cliente se desinscreve
      socket.on('leave_tenant', (tenantId: string) => {
        socket.leave(`tenant:${tenantId}`);
        logger.info('👋 Cliente saiu do tenant', {
          socketId: socket.id,
          tenantId
        });
      });

      socket.on('disconnect', () => {
        logger.info('🔌 WebSocket cliente desconectado', {
          socketId: socket.id
        });
      });
    });
  }

  /**
   * Notifica início de sincronização SNGPC
   */
  notifySyncStarted(tenantId: string, submissionId: string): void {
    const event: SngpcSyncEvent = {
      type: 'sync_started',
      tenantId,
      submissionId,
      timestamp: new Date()
    };

    this.io.to(`tenant:${tenantId}`).emit('sngpc:sync_started', event);

    logger.info('📡 Evento WebSocket emitido: sync_started', {
      tenantId,
      submissionId
    });
  }

  /**
   * Notifica conclusão de sincronização SNGPC
   */
  notifySyncCompleted(
    tenantId: string,
    submissionId: string,
    movementsCount: number,
    duration: string
  ): void {
    const event: SngpcSyncEvent = {
      type: 'sync_completed',
      tenantId,
      submissionId,
      timestamp: new Date(),
      data: {
        movementsCount,
        duration
      }
    };

    this.io.to(`tenant:${tenantId}`).emit('sngpc:sync_completed', event);

    logger.info('📡 Evento WebSocket emitido: sync_completed', {
      tenantId,
      submissionId,
      movementsCount
    });
  }

  /**
   * Notifica falha na sincronização SNGPC
   */
  notifySyncFailed(tenantId: string, submissionId: string, error: string): void {
    const event: SngpcSyncEvent = {
      type: 'sync_failed',
      tenantId,
      submissionId,
      timestamp: new Date(),
      data: {
        error
      }
    };

    this.io.to(`tenant:${tenantId}`).emit('sngpc:sync_failed', event);

    logger.warn('📡 Evento WebSocket emitido: sync_failed', {
      tenantId,
      submissionId,
      error
    });
  }

  /**
   * Notifica geração de NF-e
   */
  notifyNFeGenerated(
    tenantId: string,
    orderId: string,
    accessKey: string,
    number: string,
    series: string
  ): void {
    const event: NFeEvent = {
      type: 'nfe_generated',
      tenantId,
      orderId,
      accessKey,
      timestamp: new Date(),
      data: {
        number,
        series
      }
    };

    this.io.to(`tenant:${tenantId}`).emit('nfe:generated', event);

    logger.info('📡 Evento WebSocket emitido: nfe_generated', {
      tenantId,
      accessKey
    });
  }

  /**
   * Notifica autorização de NF-e
   */
  notifyNFeAuthorized(tenantId: string, orderId: string, accessKey: string): void {
    const event: NFeEvent = {
      type: 'nfe_authorized',
      tenantId,
      orderId,
      accessKey,
      timestamp: new Date()
    };

    this.io.to(`tenant:${tenantId}`).emit('nfe:authorized', event);

    logger.info('📡 Evento WebSocket emitido: nfe_authorized', {
      tenantId,
      accessKey
    });
  }

  /**
   * Notifica falha na NF-e
   */
  notifyNFeFailed(tenantId: string, orderId: string, error: string): void {
    const event: NFeEvent = {
      type: 'nfe_failed',
      tenantId,
      orderId,
      timestamp: new Date(),
      data: {
        error
      }
    };

    this.io.to(`tenant:${tenantId}`).emit('nfe:failed', event);

    logger.warn('📡 Evento WebSocket emitido: nfe_failed', {
      tenantId,
      orderId,
      error
    });
  }

  /**
   * Notifica geração de relatório ANVISA
   */
  notifyReportGenerated(tenantId: string, reportId: string, reportType: string): void {
    const event: AnvisaReportEvent = {
      type: 'report_generated',
      tenantId,
      reportId,
      reportType,
      timestamp: new Date()
    };

    this.io.to(`tenant:${tenantId}`).emit('anvisa:report_generated', event);

    logger.info('📡 Evento WebSocket emitido: report_generated', {
      tenantId,
      reportId,
      reportType
    });
  }

  /**
   * Notifica exportação de relatório
   */
  notifyReportExported(tenantId: string, reportId: string, format: string): void {
    const event: AnvisaReportEvent = {
      type: 'report_exported',
      tenantId,
      reportId,
      reportType: format,
      timestamp: new Date()
    };

    this.io.to(`tenant:${tenantId}`).emit('anvisa:report_exported', event);

    logger.info('📡 Evento WebSocket emitido: report_exported', {
      tenantId,
      reportId,
      format
    });
  }

  /**
   * Envia notificação genérica para um tenant
   */
  sendNotification(
    tenantId: string,
    event: string,
    data: any
  ): void {
    this.io.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });

    logger.info('📡 Notificação WebSocket enviada', {
      tenantId,
      event
    });
  }

  /**
   * Obtém estatísticas de conexões
   */
  getConnectionStats(): { totalConnections: number; tenantRooms: number } {
    const sockets = Array.from(this.io.sockets.sockets.values());
    const tenantRooms = new Set<string>();

    sockets.forEach(socket => {
      socket.rooms.forEach(room => {
        if (room.startsWith('tenant:')) {
          tenantRooms.add(room);
        }
      });
    });

    return {
      totalConnections: sockets.length,
      tenantRooms: tenantRooms.size
    };
  }
}
