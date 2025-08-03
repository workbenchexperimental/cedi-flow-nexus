import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockUpdateRow {
  sku: string;
  new_stock: number;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  notes?: string;
}

interface ProcessingResult {
  row: number;
  sku: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  old_stock?: number;
  new_stock?: number;
}

export const BulkStockUpdate: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentCediId, setCurrentCediId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo CSV válido",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setResults([]);
    }
  };

  const downloadTemplate = () => {
    const template = `sku,new_stock,movement_type,notes
ART001,100,ADJUSTMENT,Inventario inicial
ART002,50,IN,Recepción de mercancía
ART003,25,OUT,Consumo en producción`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_actualizacion_stock.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Plantilla descargada",
      description: "Usa esta plantilla para estructurar tu archivo CSV"
    });
  };

  const parseCSV = (text: string): StockUpdateRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['sku', 'new_stock', 'movement_type'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });

      // Validate movement type
      if (!['IN', 'OUT', 'ADJUSTMENT'].includes(row.movement_type?.toUpperCase())) {
        throw new Error(`Fila ${index + 2}: Tipo de movimiento inválido. Use: IN, OUT, o ADJUSTMENT`);
      }

      // Validate new_stock is a number
      const newStock = parseFloat(row.new_stock);
      if (isNaN(newStock) || newStock < 0) {
        throw new Error(`Fila ${index + 2}: new_stock debe ser un número mayor o igual a 0`);
      }

      return {
        sku: row.sku?.toUpperCase(),
        new_stock: newStock,
        movement_type: row.movement_type?.toUpperCase() as 'IN' | 'OUT' | 'ADJUSTMENT',
        notes: row.notes || ''
      };
    });
  };

  const getCurrentCediId = async (): Promise<number> => {
    if (currentCediId) return currentCediId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data } = await supabase
      .from('users')
      .select('cedi_id')
      .eq('id', user.id)
      .single();

    if (!data?.cedi_id) throw new Error('No se pudo obtener el CEDI del usuario');
    
    setCurrentCediId(data.cedi_id);
    return data.cedi_id;
  };

  const processStockUpdate = async (updateData: StockUpdateRow[]): Promise<ProcessingResult[]> => {
    const results: ProcessingResult[] = [];
    const cediId = await getCurrentCediId();

    for (let i = 0; i < updateData.length; i++) {
      const row = updateData[i];
      setProgress(((i + 1) / updateData.length) * 100);

      try {
        // Find the article in the local inventory
        const { data: article, error: findError } = await supabase
          .from('articles')
          .select('id, current_stock')
          .eq('sku', row.sku)
          .eq('cedi_id', cediId)
          .single();

        if (findError || !article) {
          results.push({
            row: i + 2,
            sku: row.sku,
            status: 'error',
            message: 'Artículo no encontrado en el inventario local'
          });
          continue;
        }

        const oldStock = article.current_stock;

        // Calculate final stock based on movement type
        let finalStock: number;
        let actualQuantity: number;

        switch (row.movement_type) {
          case 'ADJUSTMENT':
            finalStock = row.new_stock;
            actualQuantity = row.new_stock;
            break;
          case 'IN':
            finalStock = oldStock + row.new_stock;
            actualQuantity = row.new_stock;
            break;
          case 'OUT':
            finalStock = oldStock - row.new_stock;
            actualQuantity = row.new_stock;
            if (finalStock < 0) {
              results.push({
                row: i + 2,
                sku: row.sku,
                status: 'error',
                message: `Stock insuficiente. Stock actual: ${oldStock}, solicitado: ${row.new_stock}`,
                old_stock: oldStock
              });
              continue;
            }
            break;
        }

        // Use the database function to update stock
        const { data: updateResult, error: updateError } = await supabase
          .rpc('update_article_stock', {
            p_article_id: article.id,
            p_quantity: actualQuantity,
            p_movement_type: row.movement_type,
            p_reference_type: 'CSV_BULK_UPDATE',
            p_reference_id: `bulk_${Date.now()}_row_${i + 2}`
          });

        if (updateError) {
          results.push({
            row: i + 2,
            sku: row.sku,
            status: 'error',
            message: updateError.message,
            old_stock: oldStock
          });
          continue;
        }

        const result = updateResult as any;
        if (!result.success) {
          results.push({
            row: i + 2,
            sku: row.sku,
            status: 'error',
            message: result.message || 'Error desconocido',
            old_stock: oldStock
          });
          continue;
        }

        results.push({
          row: i + 2,
          sku: row.sku,
          status: 'success',
          message: `Stock actualizado correctamente`,
          old_stock: oldStock,
          new_stock: result.new_stock
        });

      } catch (error: any) {
        results.push({
          row: i + 2,
          sku: row.sku,
          status: 'error',
          message: error.message || 'Error inesperado',
          old_stock: undefined
        });
      }
    }

    return results;
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const text = await file.text();
      const updateData = parseCSV(text);

      if (updateData.length === 0) {
        throw new Error('El archivo CSV no contiene datos válidos');
      }

      const processingResults = await processStockUpdate(updateData);
      setResults(processingResults);

      const successCount = processingResults.filter(r => r.status === 'success').length;
      const errorCount = processingResults.filter(r => r.status === 'error').length;

      toast({
        title: "Procesamiento completado",
        description: `${successCount} exitosos, ${errorCount} errores`,
        variant: successCount > 0 ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: error.message || "Error al procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: { icon: CheckCircle, className: 'bg-gradient-healthy text-healthy-foreground' },
      error: { icon: XCircle, className: 'bg-gradient-critical text-critical-foreground' },
      warning: { icon: AlertTriangle, className: 'bg-gradient-warning text-warning-foreground' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.error;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'success' ? 'Éxito' : status === 'error' ? 'Error' : 'Advertencia'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            RF-204: Actualización Masiva de Stock (CSV)
          </CardTitle>
          <CardDescription>
            Actualiza el inventario de tu CEDI mediante un archivo CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato del archivo CSV:</strong>
              <br />• Columnas requeridas: sku, new_stock, movement_type
              <br />• Columna opcional: notes
              <br />• movement_type: IN (entrada), OUT (salida), ADJUSTMENT (ajuste)
              <br />• Usa la plantilla descargable para mayor precisión
            </AlertDescription>
          </Alert>

          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">Seleccionar Archivo CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={processing}
                />
                {file && (
                  <div className="text-sm text-muted-foreground">
                    Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleProcessFile}
                  disabled={!file || processing}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {processing ? 'Procesando...' : 'Procesar Archivo'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  disabled={processing}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {processing && (
                <div className="space-y-2">
                  <Label>Progreso del procesamiento</Label>
                  <Progress value={progress} className="w-full" />
                  <div className="text-sm text-muted-foreground">
                    {progress.toFixed(0)}% completado
                  </div>
                </div>
              )}
              
              {results.length > 0 && (
                <div className="space-y-2">
                  <Label>Resumen de resultados</Label>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold text-green-600">
                        {results.filter(r => r.status === 'success').length}
                      </div>
                      <div className="text-xs">Exitosos</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold text-red-600">
                        {results.filter(r => r.status === 'error').length}
                      </div>
                      <div className="text-xs">Errores</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold">
                        {results.length}
                      </div>
                      <div className="text-xs">Total</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Procesamiento</CardTitle>
            <CardDescription>
              Detalle de cada fila procesada del archivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Stock Anterior</TableHead>
                    <TableHead>Stock Nuevo</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell className="font-mono">{result.sku}</TableCell>
                      <TableCell>{getStatusBadge(result.status)}</TableCell>
                      <TableCell>
                        {result.old_stock !== undefined ? result.old_stock : '-'}
                      </TableCell>
                      <TableCell>
                        {result.new_stock !== undefined ? result.new_stock : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{result.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};