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
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      const { data, error } = await supabase.rpc('get_dashboard_metrics_by_role');
      
      if (error) throw error;
      
      if (data) {
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
          <CardTitle className="text-sm font-medium">Producción Hoy</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.summary?.total_operators || 0}</div>
          <p className="text-xs text-muted-foreground">registros de producción</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

// CEDI Administrator Dashboard
const AdminDashboard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <div className="space-y-6">
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
          <CardTitle className="text-sm font-medium">Inventario</CardTitle>
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