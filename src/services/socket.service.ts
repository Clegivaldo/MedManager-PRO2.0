import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(token: string, tenantId?: string) {
        if (this.socket?.connected) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
        // Remove /api/v1 se estiver presente para pegar a raiz
        const baseUrl = apiUrl.replace(/\/api\/v1$/, '');

        this.socket = io(baseUrl, {
            path: '/socket.io',
            auth: { token },
            extraHeaders: tenantId ? { 'x-tenant-id': tenantId } : {}
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Re-attach listeners
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, (data) => callback(data));
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);

        if (this.socket) {
            this.socket.on(event, (data) => callback(data));
        }

        // Return cleanup function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
            this.socket?.off(event, (data) => callback(data));
        };
    }
}

export const socketService = new SocketService();
