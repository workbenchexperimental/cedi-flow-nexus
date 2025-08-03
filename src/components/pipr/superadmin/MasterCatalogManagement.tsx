import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Package, Plus, Edit, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const articleSchema = z.object({
  sku: z.string().min(3, 'El SKU debe tener al menos 3 caracteres'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
});

const packageSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;
type PackageFormData = z.infer<typeof packageSchema>;

interface MasterArticle {
  id: number;
  sku: string;
  name: string;
  description?: string;
}

interface MasterPackage {
  id: number;
  name: string;
  description?: string;
}

export const MasterCatalogManagement: React.FC = () => {
  const [articles, setArticles] = useState<MasterArticle[]>([]);
  const [packages, setPackages] = useState<MasterPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MasterArticle | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<MasterPackage | null>(null);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const { toast } = useToast();

  const articleForm = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      sku: '',
      name: '',
      description: '',
    },
  });

  const packageForm = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('master_articles')
        .select('*')
        .order('name');

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los artículos maestros',
        variant: 'destructive',
      });
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('master_packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los paquetes maestros',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchArticles(), fetchPackages()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const onArticleSubmit = async (data: ArticleFormData) => {
    try {
      if (selectedArticle) {
        // Actualizar artículo existente
        const { error } = await supabase
          .from('master_articles')
          .update({
            sku: data.sku,
            name: data.name,
            description: data.description || null,
          })
          .eq('id', selectedArticle.id);

        if (error) throw error;

        toast({
          title: 'Artículo actualizado',
          description: `${data.name} ha sido actualizado correctamente`,
        });
      } else {
        // Crear nuevo artículo
        const { error } = await supabase
          .from('master_articles')
          .insert([{
            sku: data.sku,
            name: data.name,
            description: data.description || null,
          }]);

        if (error) throw error;

        toast({
          title: 'Artículo creado',
          description: `${data.name} ha sido creado correctamente`,
        });
      }

      setIsArticleDialogOpen(false);
      setSelectedArticle(null);
      articleForm.reset();
      fetchArticles();
    } catch (error) {
      toast({
        title: 'Error',
        description: selectedArticle ? 'No se pudo actualizar el artículo' : 'No se pudo crear el artículo',
        variant: 'destructive',
      });
    }
  };

  const onPackageSubmit = async (data: PackageFormData) => {
    try {
      if (selectedPackage) {
        // Actualizar paquete existente
        const { error } = await supabase
          .from('master_packages')
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq('id', selectedPackage.id);

        if (error) throw error;

        toast({
          title: 'Paquete actualizado',
          description: `${data.name} ha sido actualizado correctamente`,
        });
      } else {
        // Crear nuevo paquete
        const { error } = await supabase
          .from('master_packages')
          .insert([{
            name: data.name,
            description: data.description || null,
          }]);

        if (error) throw error;

        toast({
          title: 'Paquete creado',
          description: `${data.name} ha sido creado correctamente`,
        });
      }

      setIsPackageDialogOpen(false);
      setSelectedPackage(null);
      packageForm.reset();
      fetchPackages();
    } catch (error) {
      toast({
        title: 'Error',
        description: selectedPackage ? 'No se pudo actualizar el paquete' : 'No se pudo crear el paquete',
        variant: 'destructive',
      });
    }
  };

  const deleteArticle = async (article: MasterArticle) => {
    if (!confirm(`¿Está seguro de eliminar el artículo "${article.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('master_articles')
        .delete()
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: 'Artículo eliminado',
        description: `${article.name} ha sido eliminado correctamente`,
      });

      fetchArticles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el artículo. Verifique que no tenga datos asociados.',
        variant: 'destructive',
      });
    }
  };

  const deletePackage = async (pkg: MasterPackage) => {
    if (!confirm(`¿Está seguro de eliminar el paquete "${pkg.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('master_packages')
        .delete()
        .eq('id', pkg.id);

      if (error) throw error;

      toast({
        title: 'Paquete eliminado',
        description: `${pkg.name} ha sido eliminado correctamente`,
      });

      fetchPackages();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el paquete. Verifique que no tenga datos asociados.',
        variant: 'destructive',
      });
    }
  };

  const openArticleDialog = (article?: MasterArticle) => {
    if (article) {
      setSelectedArticle(article);
      articleForm.reset({
        sku: article.sku,
        name: article.name,
        description: article.description || '',
      });
    } else {
      setSelectedArticle(null);
      articleForm.reset({
        sku: '',
        name: '',
        description: '',
      });
    }
    setIsArticleDialogOpen(true);
  };

  const openPackageDialog = (pkg?: MasterPackage) => {
    if (pkg) {
      setSelectedPackage(pkg);
      packageForm.reset({
        name: pkg.name,
        description: pkg.description || '',
      });
    } else {
      setSelectedPackage(null);
      packageForm.reset({
        name: '',
        description: '',
      });
    }
    setIsPackageDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Catálogo Maestro</CardTitle>
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
              <Package className="h-5 w-5" />
              Gestión de Catálogo Maestro
            </CardTitle>
            <CardDescription>
              Administrar artículos y paquetes maestros para todos los CEDIs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Artículos Maestros ({articles.length})
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Paquetes Maestros ({packages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openArticleDialog()} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Artículo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedArticle ? 'Editar Artículo' : 'Crear Nuevo Artículo'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedArticle
                        ? 'Modifique los datos del artículo maestro'
                        : 'Complete los datos del nuevo artículo maestro'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...articleForm}>
                    <form onSubmit={articleForm.handleSubmit(onArticleSubmit)} className="space-y-4">
                      <FormField
                        control={articleForm.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="ART-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={articleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre del artículo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={articleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descripción del artículo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsArticleDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {selectedArticle ? 'Actualizar' : 'Crear'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <Card key={article.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{article.name}</CardTitle>
                      <Badge variant="outline">{article.sku}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {article.description && (
                      <p className="text-sm text-muted-foreground">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openArticleDialog(article)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteArticle(article)}
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
            {articles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay artículos maestros registrados. Cree el primer artículo para comenzar.
              </div>
            )}
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openPackageDialog()} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Paquete
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedPackage ? 'Editar Paquete' : 'Crear Nuevo Paquete'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedPackage
                        ? 'Modifique los datos del paquete maestro'
                        : 'Complete los datos del nuevo paquete maestro'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...packageForm}>
                    <form onSubmit={packageForm.handleSubmit(onPackageSubmit)} className="space-y-4">
                      <FormField
                        control={packageForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre del paquete" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={packageForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descripción del paquete" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPackageDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {selectedPackage ? 'Actualizar' : 'Crear'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{pkg.name}</CardTitle>
                      <Badge variant="secondary">Paquete</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">
                        {pkg.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPackageDialog(pkg)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePackage(pkg)}
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
            {packages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay paquetes maestros registrados. Cree el primer paquete para comenzar.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};