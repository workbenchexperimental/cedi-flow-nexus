import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Edit, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const localArticleSchema = z.object({
  current_stock: z.number().min(0, "Stock no puede ser negativo"),
  reorder_point: z.number().min(0, "Punto de reorden no puede ser negativo"),
  unit_cost: z.number().min(0, "Costo unitario no puede ser negativo"),
  supplier: z.string().optional(),
});

type LocalArticleFormData = z.infer<typeof localArticleSchema>;

interface MasterArticle {
  id: number;
  sku: string;
  name: string;
  description?: string;
}

interface LocalArticle {
  id: number;
  sku: string;
  name: string;
  description?: string;
  current_stock: number;
  reorder_point: number;
  unit_cost: number;
  supplier?: string;
  master_article_id?: number;
  cedi_id: number;
}

interface MasterPackage {
  id: number;
  name: string;
  description?: string;
}

interface LocalPackage {
  id: number;
  name: string;
  description?: string;
  commission_value: number;
  master_package_id?: number;
  cedi_id: number;
}

export const LocalCatalogManagement: React.FC = () => {
  const [masterArticles, setMasterArticles] = useState<MasterArticle[]>([]);
  const [localArticles, setLocalArticles] = useState<LocalArticle[]>([]);
  const [masterPackages, setMasterPackages] = useState<MasterPackage[]>([]);
  const [localPackages, setLocalPackages] = useState<LocalPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMasterArticle, setSelectedMasterArticle] = useState<MasterArticle | null>(null);
  const [currentCediId, setCurrentCediId] = useState<number | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LocalArticleFormData>({
    resolver: zodResolver(localArticleSchema)
  });

  useEffect(() => {
    fetchCurrentCediId();
  }, []);

  useEffect(() => {
    if (currentCediId) {
      fetchCatalogData();
    }
  }, [currentCediId]);

  const fetchCurrentCediId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('cedi_id')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrentCediId(data.cedi_id);
      }
    } catch (error) {
      console.error('Error fetching CEDI ID:', error);
    }
  };

  const fetchCatalogData = async () => {
    if (!currentCediId) return;

    try {
      setLoading(true);

      // Fetch master articles
      const { data: masterArticlesData, error: masterError } = await supabase
        .from('master_articles')
        .select('*')
        .order('name');

      if (masterError) throw masterError;

      // Fetch local articles for this CEDI
      const { data: localArticlesData, error: localError } = await supabase
        .from('articles')
        .select('*')
        .eq('cedi_id', currentCediId)
        .order('name');

      if (localError) throw localError;

      // Fetch master packages
      const { data: masterPackagesData, error: masterPackagesError } = await supabase
        .from('master_packages')
        .select('*')
        .order('name');

      if (masterPackagesError) throw masterPackagesError;

      // Fetch local packages for this CEDI
      const { data: localPackagesData, error: localPackagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('cedi_id', currentCediId)
        .order('name');

      if (localPackagesError) throw localPackagesError;

      setMasterArticles(masterArticlesData || []);
      setLocalArticles(localArticlesData || []);
      setMasterPackages(masterPackagesData || []);
      setLocalPackages(localPackagesData || []);
    } catch (error: any) {
      console.error('Error fetching catalog data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del catálogo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitArticle = async (data: LocalArticleFormData) => {
    if (!selectedMasterArticle || !currentCediId) return;

    try {
      const { error } = await supabase
        .from('articles')
        .insert({
          sku: selectedMasterArticle.sku,
          name: selectedMasterArticle.name,
          description: selectedMasterArticle.description,
          master_article_id: selectedMasterArticle.id,
          cedi_id: currentCediId,
          current_stock: data.current_stock,
          reorder_point: data.reorder_point,
          unit_cost: data.unit_cost,
          supplier: data.supplier || null
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Artículo habilitado en el catálogo local"
      });

      setDialogOpen(false);
      setSelectedMasterArticle(null);
      reset();
      fetchCatalogData();
    } catch (error: any) {
      console.error('Error enabling article:', error);
      toast({
        title: "Error",
        description: "No se pudo habilitar el artículo",
        variant: "destructive"
      });
    }
  };

  const handleEnableArticle = (masterArticle: MasterArticle) => {
    // Check if already enabled
    const isEnabled = localArticles.some(la => la.master_article_id === masterArticle.id);
    if (isEnabled) {
      toast({
        title: "Información",
        description: "Este artículo ya está habilitado en tu CEDI",
        variant: "default"
      });
      return;
    }

    setSelectedMasterArticle(masterArticle);
    reset();
    setDialogOpen(true);
  };

  const handleDisableArticle = async (articleId: number) => {
    if (!confirm('¿Estás seguro de que quieres deshabilitar este artículo?')) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
        .eq('cedi_id', currentCediId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Artículo deshabilitado del catálogo local"
      });
      
      fetchCatalogData();
    } catch (error: any) {
      console.error('Error disabling article:', error);
      toast({
        title: "Error",
        description: "No se pudo deshabilitar el artículo",
        variant: "destructive"
      });
    }
  };

  const handleEnablePackage = async (masterPackage: MasterPackage) => {
    // Check if already enabled
    const isEnabled = localPackages.some(lp => lp.master_package_id === masterPackage.id);
    if (isEnabled) {
      toast({
        title: "Información",
        description: "Este paquete ya está habilitado en tu CEDI",
        variant: "default"
      });
      return;
    }

    if (!currentCediId) return;

    try {
      const { error } = await supabase
        .from('packages')
        .insert({
          name: masterPackage.name,
          description: masterPackage.description,
          master_package_id: masterPackage.id,
          cedi_id: currentCediId,
          commission_value: 0
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Paquete habilitado en el catálogo local"
      });
      
      fetchCatalogData();
    } catch (error: any) {
      console.error('Error enabling package:', error);
      toast({
        title: "Error",
        description: "No se pudo habilitar el paquete",
        variant: "destructive"
      });
    }
  };

  const getStockBadge = (article: LocalArticle) => {
    if (article.current_stock === 0) {
      return <Badge variant="destructive">Sin Stock</Badge>;
    } else if (article.current_stock <= article.reorder_point) {
      return <Badge className="bg-gradient-warning text-warning-foreground">Bajo Stock</Badge>;
    } else {
      return <Badge className="bg-gradient-healthy text-healthy-foreground">En Stock</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando catálogo local...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            RF-202: Gestión de Catálogo Local
          </CardTitle>
          <CardDescription>
            Habilita artículos y paquetes del catálogo maestro para tu CEDI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="articles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="articles">Artículos</TabsTrigger>
              <TabsTrigger value="packages">Paquetes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="articles" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Master Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Catálogo Maestro de Artículos</CardTitle>
                    <CardDescription>
                      Artículos disponibles para habilitar en tu CEDI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {masterArticles.map((article) => {
                        const isEnabled = localArticles.some(la => la.master_article_id === article.id);
                        return (
                          <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{article.name}</div>
                              <div className="text-sm text-muted-foreground">SKU: {article.sku}</div>
                              {article.description && (
                                <div className="text-xs text-muted-foreground mt-1">{article.description}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isEnabled ? "outline" : "default"}
                              onClick={() => handleEnableArticle(article)}
                              disabled={isEnabled}
                              className={!isEnabled ? "bg-gradient-primary text-primary-foreground" : ""}
                            >
                              {isEnabled ? (
                                <>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Habilitado
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Habilitar
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Local Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Artículos Locales Habilitados</CardTitle>
                    <CardDescription>
                      Artículos activos en tu CEDI con inventario
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {localArticles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2" />
                          <p>No hay artículos habilitados</p>
                          <p className="text-sm">Habilita artículos del catálogo maestro</p>
                        </div>
                      ) : (
                        localArticles.map((article) => (
                          <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{article.name}</div>
                              <div className="text-sm text-muted-foreground">SKU: {article.sku}</div>
                              <div className="flex items-center gap-2 mt-2">
                                {getStockBadge(article)}
                                <span className="text-xs">Stock: {article.current_stock}</span>
                                <span className="text-xs">Reorden: {article.reorder_point}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDisableArticle(article.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <EyeOff className="w-4 h-4 mr-1" />
                              Deshabilitar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="packages" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Master Packages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Catálogo Maestro de Paquetes</CardTitle>
                    <CardDescription>
                      Paquetes disponibles para habilitar en tu CEDI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {masterPackages.map((pkg) => {
                        const isEnabled = localPackages.some(lp => lp.master_package_id === pkg.id);
                        return (
                          <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{pkg.name}</div>
                              {pkg.description && (
                                <div className="text-sm text-muted-foreground mt-1">{pkg.description}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isEnabled ? "outline" : "default"}
                              onClick={() => handleEnablePackage(pkg)}
                              disabled={isEnabled}
                              className={!isEnabled ? "bg-gradient-primary text-primary-foreground" : ""}
                            >
                              {isEnabled ? (
                                <>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Habilitado
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Habilitar
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Local Packages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Paquetes Locales Habilitados</CardTitle>
                    <CardDescription>
                      Paquetes activos en tu CEDI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {localPackages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2" />
                          <p>No hay paquetes habilitados</p>
                          <p className="text-sm">Habilita paquetes del catálogo maestro</p>
                        </div>
                      ) : (
                        localPackages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{pkg.name}</div>
                              {pkg.description && (
                                <div className="text-sm text-muted-foreground mt-1">{pkg.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                Comisión: ${pkg.commission_value}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enable Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Habilitar Artículo Local</DialogTitle>
            <DialogDescription>
              Configura los atributos locales para {selectedMasterArticle?.name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmitArticle)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stock Inicial</Label>
                <Input
                  id="current_stock"
                  type="number"
                  {...register('current_stock', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.current_stock && (
                  <p className="text-sm text-destructive">{errors.current_stock.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder_point">Punto de Reorden</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  {...register('reorder_point', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.reorder_point && (
                  <p className="text-sm text-destructive">{errors.reorder_point.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Costo Unitario</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  {...register('unit_cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.unit_cost && (
                  <p className="text-sm text-destructive">{errors.unit_cost.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor (Opcional)</Label>
                <Input
                  id="supplier"
                  {...register('supplier')}
                  placeholder="Nombre del proveedor"
                />
              </div>
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
                Habilitar Artículo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};