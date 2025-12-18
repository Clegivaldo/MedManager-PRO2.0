import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowRight, Check, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    limitType?: string;
    current?: number;
    limit?: number;
    message?: string;
}

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 99,
        maxUsers: 1,
        maxProducts: 100,
        maxTransactions: 100,
        maxStorage: 5,
        features: ['Gestão Básica', 'NF-e Básica', 'Suporte Email']
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 299,
        maxUsers: 5,
        maxProducts: 500,
        maxTransactions: 1000,
        maxStorage: 50,
        features: ['Gestão Completa', 'NF-e Ilimitada', 'Relatórios Avançados', 'Suporte Prioritário'],
        recommended: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 999,
        maxUsers: -1, // Ilimitado
        maxProducts: -1,
        maxTransactions: -1,
        maxStorage: 500,
        features: ['Tudo do Professional', 'Usuários Ilimitados', 'API Premium', 'Suporte 24/7', 'Gerente de Conta']
    }
];

export function UpgradeModal({
    open,
    onOpenChange,
    limitType = 'resource',
    current = 0,
    limit = 0,
    message
}: UpgradeModalProps) {
    const [loading, setLoading] = useState(false);

    const getLimitLabel = (type: string) => {
        const labels: Record<string, string> = {
            user: 'usuários',
            product: 'produtos',
            transaction: 'transações mensais',
            storage: 'GB de armazenamento'
        };
        return labels[type] || type;
    };

    const handleUpgrade = async (planId: string) => {
        setLoading(true);
        try {
            // TODO: Integrar com API de upgrade
            console.log('Upgrading to plan:', planId);

            // Por enquanto, apenas redirecionar para página de planos
            window.location.href = `/settings?tab=subscription&upgrade=${planId}`;
        } catch (error) {
            console.error('Error upgrading:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Zap className="h-6 w-6 text-yellow-500" />
                        Limite do Plano Atingido
                    </DialogTitle>
                    <DialogDescription>
                        {message || `Você atingiu o limite de ${getLimitLabel(limitType)} do seu plano atual.`}
                    </DialogDescription>
                </DialogHeader>

                <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        <strong>Uso Atual:</strong> {current} / {limit} {getLimitLabel(limitType)}
                    </AlertDescription>
                </Alert>

                <div>
                    <h3 className="text-lg font-semibold mb-4">Escolha um Plano Superior</h3>

                    <div className="grid gap-4 md:grid-cols-3">
                        {PLANS.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`relative ${plan.recommended ? 'border-primary shadow-lg' : ''}`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                        <Badge className="bg-primary text-primary-foreground">
                                            Recomendado
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        {plan.name}
                                        <span className="text-2xl font-bold text-primary">
                                            R$ {plan.price}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>/mês</CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Usuários:</span>
                                            <span className="font-medium">
                                                {plan.maxUsers === -1 ? 'Ilimitado' : plan.maxUsers}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Produtos:</span>
                                            <span className="font-medium">
                                                {plan.maxProducts === -1 ? 'Ilimitado' : plan.maxProducts}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Transações/mês:</span>
                                            <span className="font-medium">
                                                {plan.maxTransactions === -1 ? 'Ilimitado' : plan.maxTransactions}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Armazenamento:</span>
                                            <span className="font-medium">{plan.maxStorage} GB</span>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3">
                                        <ul className="space-y-2 text-sm">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button
                                        className="w-full"
                                        variant={plan.recommended ? 'default' : 'outline'}
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={loading}
                                    >
                                        Fazer Upgrade
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
