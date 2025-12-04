import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
    user?: any;
    tenantId?: string;
}

class SocketService {
    private io: Server | null = null;

    initialize(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: config.CORS_ORIGINS ? config.CORS_ORIGINS.split(',') : '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            path: '/socket.io'
        });

        this.io.use(async (socket: AuthenticatedSocket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication error'));
                }

                const decoded = jwt.verify(token, config.JWT_SECRET) as any;
                socket.user = decoded;

                // Se o token tiver tenantId, usa ele. Se não, tenta pegar do header handshake
                socket.tenantId = decoded.tenantId || socket.handshake.headers['x-tenant-id'];

                next();
            } catch (err) {
                next(new Error('Authentication error'));
            }
        });

        this.io.on('connection', (socket: AuthenticatedSocket) => {
            // Cast to any to avoid lint errors about missing properties if types are not fully loaded
            const s = socket as any;
            logger.info(`Socket connected: ${s.id} (User: ${s.user?.id}, Tenant: ${s.tenantId})`);

            if (s.tenantId) {
                s.join(`tenant:${s.tenantId}`);
            }

            s.on('disconnect', () => {
                logger.info(`Socket disconnected: ${s.id}`);
            });
        });

        logger.info('Socket.io initialized');
    }

    /**
     * Envia notificação para um tenant específico
     */
    emitToTenant(tenantId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(`tenant:${tenantId}`).emit(event, data);
        }
    }

    /**
     * Envia notificação para todos os usuários conectados
     */
    emitToAll(event: string, data: any) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

export const socketService = new SocketService();
