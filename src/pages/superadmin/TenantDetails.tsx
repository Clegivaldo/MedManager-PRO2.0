import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building,
  Users,
  HardDrive,
  Layers,
  ArrowLeft,
  Activity,
  User,
  Package,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const tenantData = {
  "TEN-001": {
    name: "Farmácia Central LTDA",
    cnpj: "12.345.678/0001-99",
    plan: "Profissional",
    status: "active",
    users: 15,
    storage: 7.5, // in GB
    storageLimit: 20,
    apiUsage: [
      { date: "Seg", requests: 4500 },
      { date: "Ter", requests: 5200 },
      { date: "Qua", requests: 7100 },
      { date: "Qui", requests: 6300 },
      { date: "Sex", requests: 8900 },
      { date: "Sáb", requests: 3200 },
      { date: "Dom", requests: 1500 },
    ],
    recentActivities: [
      { user: "Dr. João Silva", action: "criou o pedido #PED-2024-004", time: "há 2 horas", icon: Package },
      { user: "Ana Costa", action: "adicionou o produto 'Dipirona 500mg'", time: "há 5 horas", icon: Package },
      { user: "Carlos Santos", action: "registrou entrada de 500 unidades de 'Paracetamol'", time: "há 8 horas", icon: Package },
      { user: "Sistema", action: "gerou o relatório de vendas mensal", time: "ontem", icon: Activity },
      { user: "Dr. João Silva", action: "convidou um novo usuário", time: "ontem", icon: User },
    ],
  },
  // ... other tenants
};

export default function TenantDetails() {
  const { tenantId } = useParams();
  const tenant = tenantData[tenantId as keyof typeof tenantData] || tenantData['TEN-001']; // fallback for example

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "inactive": return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      case "trial": return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Link to="/superadmin/tenants">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Building className="h-8 w-8 text-muted-foreground" />
                    {tenant.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-muted-foreground font-mono">{tenant.cnpj}</p>
                    {getStatusBadge(tenant.status)}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Plano Contratado</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{tenant.plan}</div>
                <p className="text-xs text-muted-foreground">Próxima fatura em 15/12/2024</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{tenant.users}</div>
                <p className="text-xs text-muted-foreground">de 20 licenças contratadas</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Uso de Armazenamento</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{tenant.storage} GB / {tenant.storageLimit} GB</div>
                <Progress value={(tenant.storage / tenant.storageLimit) * 100} className="h-2 mt-2" />
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>Últimas ações realizadas pelos usuários do tenant.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {tenant.recentActivities.map((activity, index) => (
                            <TableRow key={index}>
                                <TableCell className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <activity.icon className="h-4 w-4 text-muted-foreground"/>
                                    </div>
                                    <div>
                                        <p className="font-medium">{activity.user}</p>
                                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">{activity.time}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Uso da API (Últimos 7 dias)</CardTitle>
                <CardDescription>Número de requisições por dia.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={tenant.apiUsage}>
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                        <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
