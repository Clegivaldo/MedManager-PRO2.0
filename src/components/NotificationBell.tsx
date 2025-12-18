import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import temperatureService from '@/services/temperature.service';

export default function NotificationBell() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadAlerts();
        // Poll every 2 minutes
        const interval = setInterval(loadAlerts, 120000);
        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            const response = await temperatureService.getAlerts(10);
            const alertData = response.data || [];
            setAlerts(alertData);
            setUnreadCount(alertData.length);
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min atrás`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {alerts.length > 0 ? (
                    <>
                        {alerts.map((alert, index) => (
                            <DropdownMenuItem key={alert.id || index} className="flex flex-col items-start py-3">
                                <div className="flex items-start justify-between w-full">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-red-600">
                                            🌡️ Alerta de Temperatura
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {alert.warehouse?.name}: {alert.alertMessage}
                                        </p>
                                        <p className="text-sm font-medium mt-1">
                                            {alert.temperature.toFixed(1)}°C
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400 ml-2">
                                        {formatTime(alert.recordedAt)}
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-center justify-center text-blue-600">
                            Ver todos os alertas
                        </DropdownMenuItem>
                    </>
                ) : (
                    <div className="py-6 text-center text-gray-500 text-sm">
                        Nenhuma notificação
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
