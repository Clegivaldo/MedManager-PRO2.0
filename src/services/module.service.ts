import api, { ApiResponse } from './api';

export interface Module {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

export interface ModuleListResponse {
    tenant: { id: string; name: string; plan: string };
    modules: Module[];
}

class ModuleService {
    async listModules(tenantId: string) {
        const res = await api.get<ApiResponse<ModuleListResponse>>(`/superadmin/modules/${tenantId}`);
        return res.data.data;
    }

    async toggleModule(tenantId: string, moduleId: string, enabled: boolean) {
        const res = await api.patch<ApiResponse<any>>(`/superadmin/modules/${tenantId}/toggle`, { moduleId, enabled });
        return res.data;
    }
}

export const moduleService = new ModuleService();
export default moduleService;
