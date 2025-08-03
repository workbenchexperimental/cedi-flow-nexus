import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Factory, 
  Users, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  LogOut,
  Settings,
  BarChart3,
  Shield,
  FolderOpen,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocalStaffManagement } from './admin/LocalStaffManagement';
import { LocalCatalogManagement } from './admin/LocalCatalogManagement';
import { BulkStockUpdate } from './admin/BulkStockUpdate';

interface DashboardData {
  timestamp: string;
  summary?: {
    total_cedis: number;
    active_cedis: number;
    total_users: number;
    total_operators: number;
  };
  cedi_info?: {
    cedi_name: string;
    total_operators: number;
    total_supervisors: number;
    total_groups: number;
  };
  inventory?: {
    total_articles: number;
    low_stock_count: number;
    out_of_stock_count: number;
    estimated_value: number;
    stock_health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  production?: {
    today_logs: number;
    pending_approvals: number;
    today_approved: number;
    avg_approval_hours: number;
  };
  orders?: {
    orders_created: number;
    orders_in_progress: number;
    orders_completed_today: number;
  };
  operario_info?: {
    name: string;
  };
  today_performance?: {
    today_logs: number;
    today_approved: number;
    pending_logs: number;
    today_units: number;
  };
  available_work?: Array<{
    id: number;
    order_ref: string;
    priority: number;
    total_packages: number;
    completed_packages: number;
  }>;
  pending_approvals?: {
    count: number;
    details: Array<{
      id: number;
      operario_name: string;
      quantity_produced: number;
      package_name: string;
      order_ref: string;
      hours_pending: number;
    }>;
  };
  team_performance?: Array<{
    operario_id: string;
    full_name: string;
    today_logs: number;
    today_approved: number;
    today_units: number;
  }>;
  health_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  notifications_count?: number;
  error?: string;
}

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    fetchUserRole();

    // Refresh dashboard every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserRole(data.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('Dashboard: Fetching dashboard data...');
      const { data, error } = await supabase.rpc('get_dashboard_metrics_by_role');
      
      console.log('Dashboard: RPC result:', { data, error });
      
      if (error) throw error;
      
      if (data) {
        console.log('Dashboard: Setting dashboard data:', data);
        setDashboardData(data as unknown as DashboardData);
      }
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del dashboard",
        variant: "destructive"
      });
    } finally {
      console.log('Dashboard: Setting loading to false');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getHealthStatusBadge = (status: string) => {
    const variants = {
      HEALTHY: 'bg-gradient-healthy text-healthy-foreground',
      WARNING: 'bg-gradient-warning text-warning-foreground',
      CRITICAL: 'bg-gradient-critical text-critical-foreground'
    };
    
    const icons = {
      HEALTHY: CheckCircle,
      WARNING: AlertTriangle,
      CRITICAL: AlertTriangle
    };

    const Icon = icons[status as keyof typeof icons] || CheckCircle;
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.HEALTHY}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'HEALTHY' ? 'Saludable' : status === 'WARNING' ? 'Atención' : 'Crítico'}
      </Badge>
    );
  };

  const getRoleTitle = (role: string) => {
    const titles = {
      superadministrador: 'Dashboard Nacional',
      administrador: 'Dashboard CEDI',
      supervisor: 'Dashboard Supervisor',
      operario: 'Dashboard Operario'
    };
    return titles[role as keyof typeof titles] || 'Dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Factory className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardData?.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{dashboardData.error}</p>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-industrial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Factory className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">PIPR</h1>
                <p className="text-sm opacity-90">{getRoleTitle(userRole)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {dashboardData?.health_status && getHealthStatusBadge(dashboardData.health_status)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-primary-foreground hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role-based Dashboard Content */}
        {dashboardData && userRole === 'superadministrador' && (
          <SuperAdminDashboard data={dashboardData} />
        )}
        
        {dashboardData && userRole === 'administrador' && (
          <AdminDashboard data={dashboardData} />
        )}
        
        {dashboardData && userRole === 'supervisor' && (
          <SupervisorDashboard data={dashboardData} />
        )}
        
        {dashboardData && userRole === 'operario' && (
          <OperatorDashboard data={dashboardData} />
        )}
      </main>
    </div>
  );
};

// Super Administrator Dashboard
const SuperAdminDashboard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <div className="space-y-6">
    {/* Métricas Principales */}
    <div className="production-grid">
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CEDIs Activos</CardTitle>
          <Factory className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.summary?.active_cedis || 0}</div>
          <p className="text-xs text-muted-foreground">
            de {data.summary?.total_cedis || 0} centros totales
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Operarios Nacional</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.summary?.total_operators || 0}</div>
          <p className="text-xs text-muted-foreground">
            de {data.summary?.total_users || 0} usuarios totales
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Producción Nacional Hoy</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(data as any)?.production_national?.total_production_today || 0}</div>
          <p className="text-xs text-muted-foreground">
            {(data as any)?.production_national?.approved_today || 0} aprobados
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CEDIs Activos Hoy</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(data as any)?.production_national?.active_cedis_today || 0}</div>
          <p className="text-xs text-muted-foreground">
            {(data as any)?.production_national?.pending_national || 0} registros pendientes
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Estado del Sistema */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado del Sistema Nacional
        </CardTitle>
        <CardDescription>Monitoreo y salud de la plataforma PIPR</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado General</span>
              {getHealthStatusBadge((data as any)?.system_status?.overall_health || 'HEALTHY')}
            </div>
            <p className="text-xs text-muted-foreground">
              Sistema de monitoreo en tiempo real
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Último Respaldo</span>
              <Badge variant="outline">
                {(data as any)?.system_status?.backup_status || 'N/A'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Tamaño: {(data as any)?.system_status?.backup_size_mb || 0} MB
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Última Actualización</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Salud por CEDI */}
    {(data as any)?.health_by_cedi && (data as any).health_by_cedi.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Estado de Salud por CEDI
          </CardTitle>
          <CardDescription>Monitoreo operativo de cada centro de distribución</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data as any).health_by_cedi.map((cedi: any, index: number) => (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {cedi.cedi_name || `CEDI ${index + 1}`}
                    {getHealthStatusBadge(cedi.health_status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Operarios:</span>
                    <span className="font-medium">{cedi.total_operators || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Producción hoy:</span>
                    <span className="font-medium">{cedi.today_production || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pendientes:</span>
                    <span className="font-medium">{cedi.pending_approvals || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inventario:</span>
                    <span className="font-medium">{cedi.total_articles || 0} artículos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Acciones Rápidas */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Administración Global
        </CardTitle>
        <CardDescription>Acciones administrativas del superadministrador</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Factory className="h-6 w-6" />
            <span className="text-sm font-medium">RF-101: Gestionar CEDIs</span>
            <span className="text-xs text-muted-foreground">Crear y configurar centros</span>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Users className="h-6 w-6" />
            <span className="text-sm font-medium">RF-102: Administradores</span>
            <span className="text-xs text-muted-foreground">Gestionar usuarios</span>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Package className="h-6 w-6" />
            <span className="text-sm font-medium">RF-104: Catálogo Maestro</span>
            <span className="text-xs text-muted-foreground">Artículos y paquetes</span>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <BarChart3 className="h-6 w-6" />
            <span className="text-sm font-medium">RF-106: Auditoría Global</span>
            <span className="text-xs text-muted-foreground">Logs de sistema</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// CEDI Administrator Dashboard
const AdminDashboard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <div className="space-y-6">
    {/* RF-203: CEDI Dashboard KPIs */}
    <div className="production-grid">
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CEDI: {data.cedi_info?.cedi_name}</CardTitle>
          <Factory className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-medium">{data.cedi_info?.total_operators || 0} Operarios</div>
          <div className="text-sm text-muted-foreground">
            {data.cedi_info?.total_supervisors || 0} Supervisores • {data.cedi_info?.total_groups || 0} Grupos
          </div>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado del Inventario</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.inventory?.total_articles || 0}</div>
          <div className="flex items-center gap-2 mt-2">
            {data.inventory?.stock_health && getHealthStatusBadge(data.inventory.stock_health)}
            <span className="text-xs text-muted-foreground">
              {data.inventory?.low_stock_count || 0} bajo stock
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Producción Hoy</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.production?.today_approved || 0}</div>
          <p className="text-xs text-muted-foreground">
            {data.production?.pending_approvals || 0} pendientes de aprobación
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.orders?.orders_completed_today || 0}</div>
          <p className="text-xs text-muted-foreground">
            completadas hoy • {data.orders?.orders_in_progress || 0} en proceso
          </p>
        </CardContent>
      </Card>
    </div>

    {/* CEDI Administrator Management Tabs */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Administración CEDI
        </CardTitle>
        <CardDescription>Gestión local del centro de distribución</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="staff">RF-201: Personal</TabsTrigger>
            <TabsTrigger value="catalog">RF-202: Catálogo</TabsTrigger>
            <TabsTrigger value="stock">RF-204: Stock CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Users className="h-6 w-6" />
                <span className="text-sm font-medium">RF-201: Personal Local</span>
                <span className="text-xs text-muted-foreground">Gestionar supervisores y operarios</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <FolderOpen className="h-6 w-6" />
                <span className="text-sm font-medium">RF-202: Catálogo Local</span>
                <span className="text-xs text-muted-foreground">Habilitar artículos y paquetes</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm font-medium">RF-203: Dashboard CEDI</span>
                <span className="text-xs text-muted-foreground">KPIs y métricas locales</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">RF-204: Stock CSV</span>
                <span className="text-xs text-muted-foreground">Actualización masiva</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="staff">
            <LocalStaffManagement />
          </TabsContent>
          
          <TabsContent value="catalog">
            <LocalCatalogManagement />
          </TabsContent>
          
          <TabsContent value="stock">
            <BulkStockUpdate />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
);

// Supervisor Dashboard
const SupervisorDashboard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <div className="space-y-6">
    <div className="production-grid">
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aprobaciones Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pending_approvals?.count || 0}</div>
          <p className="text-xs text-muted-foreground">registros por revisar</p>
        </CardContent>
      </Card>
    </div>

    {/* Pending Approvals Details */}
    {data.pending_approvals?.details && data.pending_approvals.details.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Aprobaciones Pendientes</CardTitle>
          <CardDescription>Registros de producción esperando supervisión</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.pending_approvals.details.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{approval.operario_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {approval.package_name} • Orden: {approval.order_ref}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{approval.quantity_produced} unidades</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(approval.hours_pending)}h pendiente
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

// Operator Dashboard  
const OperatorDashboard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <div className="space-y-6">
    <div className="production-grid">
      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mi Producción Hoy</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.today_performance?.today_approved || 0}</div>
          <p className="text-xs text-muted-foreground">
            {data.today_performance?.today_units || 0} unidades aprobadas
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Registros Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.today_performance?.pending_logs || 0}</div>
          <p className="text-xs text-muted-foreground">esperando aprobación</p>
        </CardContent>
      </Card>
    </div>

    {/* Available Work */}
    {data.available_work && data.available_work.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Trabajo Disponible</CardTitle>
          <CardDescription>Órdenes asignadas para producción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.available_work.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Orden: {order.order_ref}</p>
                  <p className="text-sm text-muted-foreground">
                    Prioridad: {order.priority} • {order.total_packages} paquetes
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={order.completed_packages === order.total_packages ? "default" : "secondary"}>
                    {order.completed_packages}/{order.total_packages}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

function getHealthStatusBadge(status: string) {
  const variants = {
    HEALTHY: 'bg-gradient-healthy text-healthy-foreground',
    WARNING: 'bg-gradient-warning text-warning-foreground', 
    CRITICAL: 'bg-gradient-critical text-critical-foreground'
  };
  
  const icons = {
    HEALTHY: CheckCircle,
    WARNING: AlertTriangle,
    CRITICAL: AlertTriangle
  };

  const Icon = icons[status as keyof typeof icons] || CheckCircle;
  
  return (
    <Badge className={variants[status as keyof typeof variants] || variants.HEALTHY}>
      <Icon className="w-3 h-3 mr-1" />
      {status === 'HEALTHY' ? 'Saludable' : status === 'WARNING' ? 'Atención' : 'Crítico'}
    </Badge>
  );
}