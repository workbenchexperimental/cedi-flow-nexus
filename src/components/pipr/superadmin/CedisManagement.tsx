import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Factory, Plus, Edit, Trash2, MapPin, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const cedisSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  location: z.string().min(3, 'La ubicación debe tener al menos 3 caracteres'),
  is_active: z.boolean().default(true),
});

type CedisFormData = z.infer<typeof cedisSchema>;

interface Cedi {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
}

export const CedisManagement: React.FC = () => {
  const [cedis, setCedis] = useState<Cedi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCedi, setSelectedCedi] = useState<Cedi | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CedisFormData>({
    resolver: zodResolver(cedisSchema),
    defaultValues: {
      name: '',
      location: '',
      is_active: true,
    },
  });

  const fetchCedis = async () => {
    try {
      const { data, error } = await supabase
        .from('cedis')
        .select('*')
        .order('name');

      if (error) throw error;
      setCedis(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los CEDIs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCedis();
  }, []);

  const onSubmit = async (data: CedisFormData) => {
    try {
      if (selectedCedi) {
        // Actualizar CEDI existente
        const { error } = await supabase
          .from('cedis')
          .update(data)
          .eq('id', selectedCedi.id);

        if (error) throw error;

        toast({
          title: 'CEDI actualizado',
          description: `${data.name} ha sido actualizado correctamente`,
        });
      } else {
        // Crear nuevo CEDI
        const { error } = await supabase
          .from('cedis')
          .insert(data);

        if (error) throw error;

        toast({
          title: 'CEDI creado',
          description: `${data.name} ha sido creado correctamente`,
        });
      }

      setIsDialogOpen(false);
      setSelectedCedi(null);
      form.reset();
      fetchCedis();
    } catch (error) {
      toast({
        title: 'Error',
        description: selectedCedi ? 'No se pudo actualizar el CEDI' : 'No se pudo crear el CEDI',
        variant: 'destructive',
      });
    }
  };

  const toggleCediStatus = async (cedi: Cedi) => {
    try {
      const { error } = await supabase
        .from('cedis')
        .update({ is_active: !cedi.is_active })
        .eq('id', cedi.id);

      if (error) throw error;

      toast({
        title: cedi.is_active ? 'CEDI desactivado' : 'CEDI activado',
        description: `${cedi.name} ha sido ${cedi.is_active ? 'desactivado' : 'activado'}`,
      });

      fetchCedis();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del CEDI',
        variant: 'destructive',
      });
    }
  };

  const deleteCedi = async (cedi: Cedi) => {
    if (!confirm(`¿Está seguro de eliminar el CEDI "${cedi.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cedis')
        .delete()
        .eq('id', cedi.id);

      if (error) throw error;

      toast({
        title: 'CEDI eliminado',
        description: `${cedi.name} ha sido eliminado correctamente`,
      });

      fetchCedis();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el CEDI. Verifique que no tenga datos asociados.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (cedi?: Cedi) => {
    if (cedi) {
      setSelectedCedi(cedi);
      form.reset({
        name: cedi.name,
        location: cedi.location,
        is_active: cedi.is_active,
      });
    } else {
      setSelectedCedi(null);
      form.reset({
        name: '',
        location: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de CEDIs</CardTitle>
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
              <Factory className="h-5 w-5" />
              Gestión de CEDIs
            </CardTitle>
            <CardDescription>
              Administrar centros de distribución a nivel nacional
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openEditDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo CEDI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedCedi ? 'Editar CEDI' : 'Crear Nuevo CEDI'}
                </DialogTitle>
                <DialogDescription>
                  {selectedCedi 
                    ? 'Modifique los datos del CEDI'
                    : 'Complete los datos del nuevo centro de distribución'
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del CEDI</FormLabel>
                        <FormControl>
                          <Input placeholder="CEDI Bogotá" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ubicación</FormLabel>
                        <FormControl>
                          <Input placeholder="Bogotá, Colombia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Estado Activo</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                      {selectedCedi ? 'Actualizar' : 'Crear'}
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
          {cedis.map((cedi) => (
            <Card key={cedi.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cedi.name}</CardTitle>
                  <Badge variant={cedi.is_active ? 'default' : 'secondary'}>
                    {cedi.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {cedi.location}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(cedi)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleCediStatus(cedi)}
                    className="flex items-center gap-1"
                  >
                    <Power className="h-3 w-3" />
                    {cedi.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteCedi(cedi)}
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
        {cedis.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay CEDIs registrados. Cree el primer CEDI para comenzar.
          </div>
        )}
      </CardContent>
    </Card>
  );
};