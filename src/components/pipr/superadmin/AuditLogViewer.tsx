import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shield, Search, Calendar as CalendarIcon, Filter, FileText, User, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  old_values: any;
  new_values: any;
  user_id: string;
  timestamp: string;
  user_name?: string;
}

export const AuditLogViewer: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const actions = ['all', 'INSERT', 'UPDATE', 'DELETE'];
  const tables = ['all', 'users', 'orders', 'production_logs', 'articles', 'packages', 'cedis'];

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_log')
        .select(`
          id,
          table_name,
          record_id,
          action,
          old_values,
          new_values,
          user_id,
          timestamp,
          users:user_id (
            full_name
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(200);

      // Aplicar filtros
      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable);
      }

      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('timestamp', startOfDay.toISOString())
          .lte('timestamp', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedLogs = (data || []).map(log => ({
        ...log,
        user_name: log.users?.full_name || 'Usuario desconocido',
      }));

      setAuditLogs(formattedLogs);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros de auditoría',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedAction, selectedTable, selectedDate]);

  const filteredLogs = auditLogs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.record_id.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadge = (action: string) => {
    const variants = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
    } as const;

    return (
      <Badge variant={variants[action as keyof typeof variants] || 'outline'}>
        {action}
      </Badge>
    );
  };

  const getTableIcon = (tableName: string) => {
    const icons = {
      users: User,
      orders: FileText,
      production_logs: Database,
      articles: Database,
      packages: Database,
      cedis: Database,
    };

    const Icon = icons[tableName as keyof typeof icons] || Database;
    return <Icon className="h-4 w-4" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es });
  };

  const formatJSONPreview = (obj: any) => {
    if (!obj) return 'N/A';
    const preview = JSON.stringify(obj, null, 2);
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  };

  const clearFilters = () => {
    setSelectedAction('all');
    setSelectedTable('all');
    setSelectedDate(undefined);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auditoría Global</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Auditoría Global
        </CardTitle>
        <CardDescription>
          Registro completo de todas las acciones críticas realizadas en la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Búsqueda */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en registros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de Acción */}
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action === 'all' ? 'Todas' : action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Tabla */}
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tabla" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table === 'all' ? 'Todas' : table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Fecha */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-48 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            {/* Limpiar Filtros */}
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Limpiar
            </Button>
          </div>

          {/* Resumen de filtros activos */}
          {(selectedAction !== 'all' || selectedTable !== 'all' || selectedDate || searchTerm) && (
            <div className="flex flex-wrap gap-2">
              {selectedAction !== 'all' && (
                <Badge variant="secondary">Acción: {selectedAction}</Badge>
              )}
              {selectedTable !== 'all' && (
                <Badge variant="secondary">Tabla: {selectedTable}</Badge>
              )}
              {selectedDate && (
                <Badge variant="secondary">
                  Fecha: {format(selectedDate, 'dd/MM/yyyy', { locale: es })}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary">Búsqueda: "{searchTerm}"</Badge>
              )}
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Mostrando {filteredLogs.length} de {auditLogs.length} registros
            </span>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
              Actualizar
            </Button>
          </div>

          <ScrollArea className="h-96 border rounded-md">
            <div className="space-y-2 p-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTableIcon(log.table_name)}
                          <span className="font-medium">{log.table_name}</span>
                          {getActionBadge(log.action)}
                          <Badge variant="outline">ID: {log.record_id}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      {/* User */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {log.user_name} ({log.user_id})
                      </div>

                      {/* Data Changes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {log.old_values && (
                          <div>
                            <span className="font-medium text-red-600">Valores Anteriores:</span>
                            <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded overflow-x-auto">
                              {formatJSONPreview(log.old_values)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <span className="font-medium text-green-600">Valores Nuevos:</span>
                            <pre className="mt-1 p-2 bg-green-50 border border-green-200 rounded overflow-x-auto">
                              {formatJSONPreview(log.new_values)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron registros de auditoría con los filtros aplicados.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};