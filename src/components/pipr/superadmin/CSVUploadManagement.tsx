import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CSVValidationResult {
  success: boolean;
  message: string;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  validRows: Array<{
    sku: string;
    name: string;
    description: string;
  }>;
}

export const CSVUploadManagement: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = 'sku,name,description\nART-001,Tornillo M6,Tornillo métrico de 6mm\nART-002,Tuerca M6,Tuerca métrica de 6mm\nART-003,Arandela,Arandela plana de acero';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_articulos_maestros.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateCSV = (csvText: string): CSVValidationResult => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const result: CSVValidationResult = {
      success: true,
      message: '',
      errors: [],
      validRows: [],
    };

    if (lines.length === 0) {
      return {
        ...result,
        success: false,
        message: 'El archivo CSV está vacío',
      };
    }

    // Verificar encabezados
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['sku', 'name', 'description'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

    if (missingHeaders.length > 0) {
      return {
        ...result,
        success: false,
        message: `Faltan columnas requeridas: ${missingHeaders.join(', ')}`,
      };
    }

    // Validar filas de datos
    const skuSet = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < 3) {
        result.errors.push({
          row: i + 1,
          field: 'general',
          value: lines[i],
          error: 'Faltan columnas en esta fila',
        });
        continue;
      }

      const [sku, name, description] = values;

      // Validar SKU
      if (!sku || sku.length < 3) {
        result.errors.push({
          row: i + 1,
          field: 'sku',
          value: sku,
          error: 'SKU debe tener al menos 3 caracteres',
        });
      } else if (skuSet.has(sku)) {
        result.errors.push({
          row: i + 1,
          field: 'sku',
          value: sku,
          error: 'SKU duplicado en el archivo',
        });
      } else {
        skuSet.add(sku);
      }

      // Validar nombre
      if (!name || name.length < 3) {
        result.errors.push({
          row: i + 1,
          field: 'name',
          value: name,
          error: 'Nombre debe tener al menos 3 caracteres',
        });
      }

      // Si no hay errores en esta fila, agregarla a las válidas
      if (sku && sku.length >= 3 && name && name.length >= 3 && !skuSet.has(sku)) {
        result.validRows.push({
          sku,
          name,
          description: description || '',
        });
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
      result.message = `Se encontraron ${result.errors.length} errores en el archivo`;
    } else if (result.validRows.length === 0) {
      result.success = false;
      result.message = 'No se encontraron filas válidas para importar';
    } else {
      result.message = `${result.validRows.length} artículos listos para importar`;
    }

    return result;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Error',
          description: 'Por favor seleccione un archivo CSV válido',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setValidationResult(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const fileContent = await file.text();
      setProgress(30);

      // Validar el archivo
      const validation = validateCSV(fileContent);
      setValidationResult(validation);
      setProgress(50);

      if (!validation.success) {
        setProgress(0);
        setUploading(false);
        return;
      }

      // Si la validación es exitosa, proceder con la importación
      if (validation.validRows.length > 0) {
        // Verificar SKUs existentes
        const existingSKUs = await supabase
          .from('master_articles')
          .select('sku')
          .in('sku', validation.validRows.map(row => row.sku));

        if (existingSKUs.error) throw existingSKUs.error;

        const existingSKUSet = new Set(existingSKUs.data?.map(item => item.sku) || []);
        const newRows = validation.validRows.filter(row => !existingSKUSet.has(row.sku));

        setProgress(70);

        if (newRows.length === 0) {
          toast({
            title: 'Sin cambios',
            description: 'Todos los SKUs ya existen en el catálogo maestro',
            variant: 'destructive',
          });
          setProgress(0);
          setUploading(false);
          return;
        }

        // Insertar artículos nuevos
        const { error: insertError } = await supabase
          .from('master_articles')
          .insert(newRows);

        if (insertError) throw insertError;

        setProgress(100);

        toast({
          title: 'Importación exitosa',
          description: `Se importaron ${newRows.length} artículos correctamente`,
        });

        // Limpiar formulario
        setFile(null);
        setValidationResult(null);
        const fileInput = document.getElementById('csv-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      toast({
        title: 'Error en la importación',
        description: error.message || 'Ocurrió un error durante la importación',
        variant: 'destructive',
      });
    } finally {
      setProgress(0);
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carga Masiva de Artículos (CSV)
        </CardTitle>
        <CardDescription>
          Importar masivamente el catálogo de artículos maestros mediante un archivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Descargue la plantilla CSV para formato correcto</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        <div className="space-y-2">
          <label htmlFor="csv-file" className="text-sm font-medium">
            Seleccionar Archivo CSV
          </label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Process Button */}
        {file && (
          <Button 
            onClick={processFile} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Procesando...' : 'Validar y Procesar Archivo'}
          </Button>
        )}

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {validationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {validationResult.success ? 'Validación Exitosa' : 'Errores de Validación'}
              </span>
            </div>

            <Alert variant={validationResult.success ? "default" : "destructive"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>

            {/* Success Summary */}
            {validationResult.success && validationResult.validRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Artículos a Importar:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {validationResult.validRows.slice(0, 10).map((row, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{row.sku}</Badge>
                      <span>{row.name}</span>
                    </div>
                  ))}
                  {validationResult.validRows.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      +{validationResult.validRows.length - 10} artículos más...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Details */}
            {!validationResult.success && validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detalles de Errores:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                  {validationResult.errors.slice(0, 20).map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-destructive/10 rounded">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <div className="font-medium">Fila {error.row}</div>
                        <div className="text-muted-foreground">
                          Campo: {error.field} | Valor: "{error.value}" | Error: {error.error}
                        </div>
                      </div>
                    </div>
                  ))}
                  {validationResult.errors.length > 20 && (
                    <div className="text-center text-muted-foreground">
                      +{validationResult.errors.length - 20} errores más...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <h4 className="font-medium">Instrucciones:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>El archivo debe contener las columnas: sku, name, description</li>
            <li>El SKU debe ser único y tener al menos 3 caracteres</li>
            <li>El nombre es obligatorio y debe tener al menos 3 caracteres</li>
            <li>La descripción es opcional</li>
            <li>Se validarán todos los registros antes de la importación</li>
            <li>Los SKUs duplicados con artículos existentes serán ignorados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};