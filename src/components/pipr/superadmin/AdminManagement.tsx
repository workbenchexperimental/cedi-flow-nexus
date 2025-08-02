import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Plus, Edit, Trash2, Shield, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const adminSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  cedi_id: z.string().min(1, 'Debe seleccionar un CEDI'),
  role: z.enum(['administrador', 'supervisor']),
});

type AdminFormData = z.infer<typeof adminSchema>;

interface Admin {
  id: string;
  full_name: string;
  role: string;
  cedi_id: number;
  cedi_name?: string;
}

interface Cedi {
  id: number;
  name: string;
  is_active: boolean;
}

export const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [cedis, setCedis] = useState<Cedi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      cedi_id: '',
      role: 'administrador',
    },
  });

  const fetchData = async () => {
    try {
      // Obtener CEDIs activos
      const { data: cedisData, error: cedisError } = await supabase
        .from('cedis')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (cedisError) throw cedisError;
      setCedis(cedisData || []);

      // Obtener usuarios administradores y supervisores con información del CEDI
      const { data: adminsData, error: adminsError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          role,
          cedi_id,
          cedis:cedi_id (
            name
          )
        `)
        .in('role', ['administrador', 'supervisor'])
        .order('full_name');

      if (adminsError) throw adminsError;
      
      const formattedAdmins = (adminsData || []).map(admin => ({
        ...admin,
        cedi_name: admin.cedis?.name || 'Sin CEDI asignado',
      }));
      
      setAdmins(formattedAdmins);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: AdminFormData) => {
    try {
      if (selectedAdmin) {
        // Actualizar usuario existente (sin email ni password)
        const { error } = await supabase
          .from('users')
          .update({
            full_name: data.full_name,
            role: data.role,
            cedi_id: parseInt(data.cedi_id),
          })
          .eq('id', selectedAdmin.id);

        if (error) throw error;

        toast({
          title: 'Usuario actualizado',
          description: `${data.full_name} ha sido actualizado correctamente`,
        });
      } else {
        // Crear nuevo usuario con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              role: data.role,
              cedi_id: parseInt(data.cedi_id),
            },
          },
        });

        if (authError) throw authError;

        // El trigger handle_new_user() creará el registro en la tabla users
        // Pero necesitamos actualizarlo con el rol y CEDI correcto
        if (authData.user) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              full_name: data.full_name,
              role: data.role,
              cedi_id: parseInt(data.cedi_id),
            })
            .eq('id', authData.user.id);

          if (updateError) throw updateError;
        }

        toast({
          title: 'Usuario creado',
          description: `${data.full_name} ha sido creado correctamente`,
        });
      }

      setIsDialogOpen(false);
      setSelectedAdmin(null);
      form.reset();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud',
        variant: 'destructive',
      });
    }
  };

  const deleteAdmin = async (admin: Admin) => {
    if (!confirm(`¿Está seguro de eliminar al usuario "${admin.full_name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Eliminar del Auth de Supabase (esto también eliminará el registro de users por CASCADE)
      const { error } = await supabase.auth.admin.deleteUser(admin.id);

      if (error) throw error;

      toast({
        title: 'Usuario eliminado',
        description: `${admin.full_name} ha sido eliminado correctamente`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (admin?: Admin) => {
    if (admin) {
      setSelectedAdmin(admin);
      form.reset({
        full_name: admin.full_name,
        email: '', // No mostrar email en edición por seguridad
        password: '', // No mostrar password en edición
        cedi_id: admin.cedi_id.toString(),
        role: admin.role as 'administrador' | 'supervisor',
      });
    } else {
      setSelectedAdmin(null);
      form.reset({
        full_name: '',
        email: '',
        password: '',
        cedi_id: '',
        role: 'administrador',
      });
    }
    setIsDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      administrador: 'default',
      supervisor: 'secondary',
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
        {role === 'administrador' ? 'Administrador' : 'Supervisor'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Administradores</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Administradores
            </CardTitle>
            <CardDescription>
              Crear y gestionar cuentas de administradores y supervisores de CEDI
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openEditDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedAdmin ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </DialogTitle>
                <DialogDescription>
                  {selectedAdmin 
                    ? 'Modifique los datos del usuario'
                    : 'Complete los datos del nuevo administrador o supervisor'
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!selectedAdmin && (
                    <>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="admin@empresa.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administrador">Administrador de CEDI</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cedi_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEDI Asignado</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar CEDI" />
                            </SelectTrigger>
                            <SelectContent>
                              {cedis.map((cedi) => (
                                <SelectItem key={cedi.id} value={cedi.id.toString()}>
                                  {cedi.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {selectedAdmin ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <Card key={admin.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{admin.full_name}</CardTitle>
                  {getRoleBadge(admin.role)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {admin.cedi_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  {admin.role === 'administrador' ? 'Administrador de CEDI' : 'Supervisor'}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(admin)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteAdmin(admin)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {admins.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay administradores registrados. Cree el primer usuario para comenzar.
          </div>
        )}
      </CardContent>
    </Card>
  );
};