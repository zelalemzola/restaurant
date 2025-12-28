'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export interface ExportColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean';
  format?: (value: any) => string;
}

interface DataExportProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  className?: string;
}

export function DataExport({
  data,
  columns,
  filename,
  title = "Export Data",
  className = "",
}: DataExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.key));
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(columns.map(c => c.key));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const formatValue = (value: any, column: ExportColumn): string => {
    if (value === null || value === undefined) return '';
    
    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value.toString();
      case 'date':
        return value instanceof Date ? format(value, 'yyyy-MM-dd') : 
               typeof value === 'string' ? format(new Date(value), 'yyyy-MM-dd') : 
               value.toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return typeof value === 'number' ? value.toString() : value.toString();
      default:
        return value.toString();
    }
  };

  const exportToCSV = () => {
    const selectedColumnObjects = columns.filter(c => selectedColumns.includes(c.key));
    
    // Create CSV headers
    const headers = selectedColumnObjects.map(c => c.label).join(',');
    
    // Create CSV rows
    const rows = data.map(row => 
      selectedColumnObjects.map(column => {
        const value = row[column.key];
        const formattedValue = formatValue(value, column);
        // Escape commas and quotes in CSV
        return formattedValue.includes(',') || formattedValue.includes('"') 
          ? `"${formattedValue.replace(/"/g, '""')}"` 
          : formattedValue;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const selectedColumnObjects = columns.filter(c => selectedColumns.includes(c.key));
    
    const jsonData = data.map(row => {
      const filteredRow: any = {};
      selectedColumnObjects.forEach(column => {
        filteredRow[column.label] = formatValue(row[column.key], column);
      });
      return filteredRow;
    });
    
    const json = JSON.stringify(jsonData, null, 2);
    
    // Download JSON
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    // For PDF export, we'll create a simple HTML table and use the browser's print functionality
    const selectedColumnObjects = columns.filter(c => selectedColumns.includes(c.key));
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .export-info { margin-bottom: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="export-info">
            Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}<br>
            Total records: ${data.length}
          </div>
          <table>
            <thead>
              <tr>
                ${selectedColumnObjects.map(c => `<th>${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${selectedColumnObjects.map(column => 
                    `<td>${formatValue(row[column.key], column)}</td>`
                  ).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    
    try {
      switch (exportFormat) {
        case 'csv':
          exportToCSV();
          break;
        case 'json':
          exportToJSON();
          break;
        case 'pdf':
          await exportToPDF();
          break;
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (Print/Save)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Columns</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllColumns}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllColumns}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <Label
                        htmlFor={column.key}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Info */}
          <div className="text-sm text-muted-foreground">
            <div>Records to export: {data.length}</div>
            <div>Selected columns: {selectedColumns.length}</div>
          </div>

          {/* Export Button */}
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedColumns.length === 0}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}