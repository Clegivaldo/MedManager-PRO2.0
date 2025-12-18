import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Warehouse, WarehouseFormData } from '@/services/warehouse.service';
import warehouseService from '@/services/warehouse.service';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WarehouseModalProps {
    warehouse: Warehouse | null;
    mode: 'create' | 'edit';
    onSuccess?: () => void;
}

export default function WarehouseModal({ warehouse, mode, onSuccess }: WarehouseModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<WarehouseFormData>({
        name: '',
        code: '',
        description: '',
        address: '',
        temperatureMin: undefined,
        temperatureMax: undefined,
    });
    const { toast } = useToast();

    useEffect(() => {
        if (warehouse && mode === 'edit') {
            setFormData({
                name: warehouse.name,
                code: warehouse.code,
                description: warehouse.description || '',
                address: warehouse.address || '',
                temperatureMin: warehouse.temperatureMin || undefined,
                temperatureMax: warehouse.temperatureMax || undefined,
            });
        } else {
            setFormData({
                name: '',
                code: '',
                description: '',
                address: '',
                temperatureMin: undefined,
                temperatureMax: undefined,
            });
        }
    }, [warehouse, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'edit' && warehouse) {
                await warehouseService.update(warehouse.id, formData);
                toast({
                    title: 'Armazém atualizado',
                    description: 'As informações do armazém foram atualizadas com sucesso.',
                });
            } else {
                await warehouseService.create(formData);
                toast({
                    title: 'Armazém criado',
                    description: 'O armazém foi criado com sucesso.',
                });
            }
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.response?.data?.message || 'Ocorreu um erro ao salvar o armazém.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{mode === 'edit' ? 'Editar Armazém' : 'Novo Armazém'}</DialogTitle>
                <DialogDescription>
                    {mode === 'edit'
                        ? 'Atualize as informações do armazém.'
                        : 'Configure um novo armazém com controle de temperatura.'}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="name">Nome do Armazém *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Armazém Principal"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Código *</Label>
                        <Input
                            id="code"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="Ex: ARM-01"
                            required
                            disabled={mode === 'edit'}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Localização física"
                        />
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descrição opcional do armazém"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tempMin">Temperatura Mínima (°C)</Label>
                        <Input
                            id="tempMin"
                            type="number"
                            step="0.1"
                            value={formData.temperatureMin || ''}
                            onChange={(e) => setFormData({ ...formData, temperatureMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Ex: 2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tempMax">Temperatura Máxima (°C)</Label>
                        <Input
                            id="tempMax"
                            type="number"
                            step="0.1"
                            value={formData.temperatureMax || ''}
                            onChange={(e) => setFormData({ ...formData, temperatureMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Ex: 8"
                        />
                    </div>

                    {(formData.temperatureMin || formData.temperatureMax) && (
                        <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                ⚠️ Alertas serão gerados automaticamente quando a temperatura sair deste intervalo.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" type="button" disabled={loading}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {mode === 'edit' ? 'Salvar Alterações' : 'Criar Armazém'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
