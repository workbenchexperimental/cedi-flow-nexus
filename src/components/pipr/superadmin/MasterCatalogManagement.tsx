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
import { Package, Plus, Edit, Trash2, Archive, Component } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const articleSchema = z.object({
  sku: z.string().min(3, 'El SKU debe tener al menos 3 caracteres'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
}) satisfies z.ZodType<{sku: string; name: string; description?: string}>;

const packageSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
}) satisfies z.ZodType<{name: string; description?: string}>;

type ArticleFormData = z.infer<typeof articleSchema>;
type PackageFormData = z.infer<typeof packageSchema>;

interface MasterArticle {
  id: number;
  sku: string;
  name: string;
  description: string;
  created_at: string;
}

interface MasterPackage {
  id: number;
  name: string;
  description: string;
  created_at: string;
  components?: MasterPackageComponent[];
}

interface MasterPackageComponent {
  id: number;
  master_article_id: number;
  quantity_required: number;
  master_article?: {
    sku: string;
    name: string;
  };
}

export const MasterCatalogManagement: React.FC = () => {
  const [articles, setArticles] = useState<MasterArticle[]>([]);
  const [packages, setPackages] = useState<MasterPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<MasterArticle | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<MasterPackage | null>(null);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('articles');
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
        .select(`
          *,
          master_package_components (
            id,
            master_article_id,
            quantity_required,
            master_articles (
              sku,
              name
            )
          )
        `)
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

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchArticles(), fetchPackages()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onArticleSubmit = async (data: ArticleFormData) => {
    try {
      if (selectedArticle) {
        // Actualizar artículo existente
        const { error } = await supabase
          .from('master_articles')
          .update(data)
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
          .insert([data]);

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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud',
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
          .update(data)
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
          .insert([data]);

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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud',
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
        description: 'No se pudo eliminar el artículo. Verifique que no esté siendo usado en paquetes.',
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
        description: 'No se pudo eliminar el paquete.',
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
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gestión de Catálogo Maestro
        </CardTitle>
        <CardDescription>
          Crear y modificar el catálogo maestro de artículos y paquetes disponibles para todos los CEDIs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="articles">Artículos Maestros</TabsTrigger>
            <TabsTrigger value="packages">Paquetes Maestros</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Artículos (Componentes)</h3>
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
                              <Input placeholder="Tornillo M6" {...field} />
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción detallada del artículo..."
                                {...field} 
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
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Archive className="h-3 w-3" />
                      Creado: {new Date(article.created_at).toLocaleDateString('es-ES')}
                    </div>
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Paquetes (Productos Terminados)</h3>
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
                              <Input placeholder="Kit Básico" {...field} />
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción detallada del paquete..."
                                {...field} 
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
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                    {pkg.components && pkg.components.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium">Componentes:</span>
                        {pkg.components.slice(0, 3).map((component) => (
                          <div key={component.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Component className="h-3 w-3" />
                            {component.quantity_required}x {component.master_article?.name}
                          </div>
                        ))}
                        {pkg.components.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{pkg.components.length - 3} más...
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Archive className="h-3 w-3" />
                      Creado: {new Date(pkg.created_at).toLocaleDateString('es-ES')}
                    </div>
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