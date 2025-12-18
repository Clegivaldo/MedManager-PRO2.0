import api, { ApiResponse } from './api';
import { TemperatureReading, Warehouse } from './warehouse.service';

export interface RecordTemperatureData {
    warehouseId: string;
    temperature: number;
    humidity?: number;
    recordedBy?: string;
}

export interface LatestReading {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    latestReading: TemperatureReading | null;
}

class TemperatureService {
    async record(data: RecordTemperatureData) {
        const response = await api.post<ApiResponse<TemperatureReading>>('/temperature', data);
        return response.data;
    }

    async getLatest() {
        const response = await api.get<ApiResponse<LatestReading[]>>('/temperature/latest');
        return response.data;
    }

    async getHistory(warehouseId: string, page = 1, limit = 50) {
        const response = await api.get<ApiResponse<{
            readings: TemperatureReading[];
            pagination: { page: number; limit: number; total: number; pages: number };
        }>>(`/temperature/warehouse/${warehouseId}?page=${page}&limit=${limit}`);
        return response.data;
    }

    async getAlerts(limit = 20) {
        const response = await api.get<ApiResponse<TemperatureReading[]>>(`/temperature/alerts?limit=${limit}`);
        return response.data;
    }
}

export default new TemperatureService();
