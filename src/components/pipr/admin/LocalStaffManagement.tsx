import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  full_name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  role: z.enum(['supervisor', 'operario'], {
    required_error: "Selecciona un rol",
  }),
});

type UserFormData = z.infer<typeof userSchema>;

interface LocalUser {
  id: string;
  full_name: string;
  role: 'supervisor' | 'operario';
  cedi_id: number;
}

export const LocalStaffManagement: React.FC = () => {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema)
  });

  useEffect(() => {
    fetchLocalUsers();
  }, []);

  const fetchLocalUsers = async () => {
    try {
      setLoading(true);
      
      // Get current user's CEDI
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUser } = await supabase
        .from('users')
        .select('cedi_id')
        .eq('id', user.id)
        .single();

      if (!currentUser) return;

      // Fetch users from the same CEDI (supervisors and operators only)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('cedi_id', currentUser.cedi_id)
        .in('role', ['supervisor', 'operario'])
        .order('full_name');

      if (error) throw error;
      // Filter to ensure only supervisor and operario roles
      const filteredUsers = (data || []).filter((user): user is LocalUser => 
        user.role === 'supervisor' || user.role === 'operario'
      );
      setUsers(filteredUsers);
    } catch (error: any) {
      console.error('Error fetching local users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios locales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      // Get current user's CEDI
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUser } = await supabase
        .from('users')
        .select('cedi_id')
        .eq('id', user.id)
        .single();

      if (!currentUser) {
        toast({
          title: "Error",
          description: "No se pudo obtener información del CEDI actual",
          variant: "destructive"
        });
        return;
      }

      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: data.full_name,
            role: data.role
          })
          .eq('id', editingUser.id)
          .eq('cedi_id', currentUser.cedi_id); // Ensure user belongs to current CEDI

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Usuario actualizado correctamente"
        });
      } else {
        // For new users, we would need to integrate with auth system
        // This is a placeholder - in real implementation, you'd create auth user first
        toast({
          title: "Información",
          description: "La creación de nuevos usuarios requiere integración con el sistema de autenticación",
          variant: "default"
        });
        return;
      }

      setDialogOpen(false);
      setEditingUser(null);
      reset();
      fetchLocalUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el usuario",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (user: LocalUser) => {
    setEditingUser(user);
    setValue('full_name', user.full_name);
    setValue('role', user.role);
    setDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente"
      });
      
      fetchLocalUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive"
      });
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    reset();
    setDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      supervisor: 'bg-gradient-primary text-primary-foreground',
      operario: 'bg-gradient-secondary text-secondary-foreground'
    };
    
    return (
      <Badge className={variants[role as keyof typeof variants]}>
        {role === 'supervisor' ? 'Supervisor' : 'Operario'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando personal local...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                RF-201: Gestión de Personal Local
              </CardTitle>
              <CardDescription>
                Administra supervisores y operarios de tu CEDI
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-gradient-primary text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser 
                      ? 'Modifica la información del usuario'
                      : 'Crea un nuevo supervisor u operario para tu CEDI'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      {...register('full_name')}
                      placeholder="Ingresa el nombre completo"
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select onValueChange={(value) => setValue('role', value as 'supervisor' | 'operario')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="operario">Operario</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                      {editingUser ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>ID Usuario</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p>No hay personal local registrado</p>
                        <p className="text-sm">Crea el primer usuario para comenzar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="font-mono text-sm">{user.id.slice(-8)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {users.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total: {users.length} usuarios | 
              Supervisores: {users.filter(u => u.role === 'supervisor').length} | 
              Operarios: {users.filter(u => u.role === 'operario').length}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};