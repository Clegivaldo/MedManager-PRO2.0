// src/services/user-management.service.ts
import api from './api';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastAccess: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InviteUserDTO {
    name: string;
    email: string;
    role: string;
}

export interface UpdateUserDTO {
    name?: string;
    role?: string;
    permissions?: string[];
}

export interface UsersListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
}

class UserManagementService {
    /**
     * Listar usuários com paginação
     */
    async listUsers(params?: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
    }): Promise<UsersListResponse> {
        const response = await api.get('/users', { params });
        // API padrão retorna { success, data }, então extrair .data quando presente
        // Alguns endpoints retornam diretamente o payload; lidar com ambos os casos
        return response.data?.data ? response.data.data : response.data;
    }

    /**
     * Convidar novo usuário
     */
    async inviteUser(data: InviteUserDTO): Promise<User> {
        const response = await api.post('/users/invite', data);
        return response.data.data;
    }

    /**
     * Atualizar usuário
     */
    async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
        const response = await api.put(`/users/${id}`, data);
        return response.data.data;
    }

    /**
     * Desativar usuário
     */
    async deactivateUser(id: string): Promise<void> {
        await api.delete(`/users/${id}`);
    }

    /**
     * Reativar usuário
     */
    async activateUser(id: string): Promise<void> {
        await api.put(`/users/${id}/activate`);
    }

    /**
     * Atualizar permissões do usuário
     */
    async updatePermissions(id: string, permissions: string[]): Promise<void> {
        await api.put(`/users/${id}/permissions`, { permissions });
    }
}

export default new UserManagementService();
