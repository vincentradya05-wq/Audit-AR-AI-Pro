import React, { useState } from 'react';
import { AuditRecord } from '../types';
import { FileUp, Loader2, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';

interface UploadProps {
  onDataLoaded: (data: AuditRecord[]) => void;
}

const Upload: React.FC<UploadProps> = ({ onDataLoaded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCSV = (text: string) => {
    try {
      // Normalize line endings to handle CRLF and LF
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n');
      
      if (lines.length < 2) {
        throw new Error("File is empty or contains no data rows.");
      }

      const data: AuditRecord[] = [];
      
      // Detect delimiter from the first line (Header)
      // If semicolon count > comma count, assume semicolon (common in Indonesian CSVs)
      const header = lines[0];
      const semicolonCount = (header.match(/;/g) || []).length;
      const commaCount = (header.match(/,/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';

      // Start from index 1 (skipping header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple split by delimiter
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        
        // We expect at least: Name, Balance
        if (cols.length < 2) continue;

        const rawName = cols[0];
        let rawBalance = cols[1];
        let rawAging = cols[2];
        const rawDate = cols[3];

        // Clean Number Strings
        if (delimiter === ';') {
          // Remove dots (thousands separator) and replace comma with dot (decimal)
          rawBalance = rawBalance.replace(/\./g, '').replace(',', '.');
        } else {
          // Standard format (1,000,000.00), remove commas
          rawBalance = rawBalance.replace(/,/g, '');
        }

        // Remove currency symbols and other non-numeric chars (allow negative sign and decimal point)
        const balance = parseFloat(rawBalance.replace(/[^0-9.-]/g, ''));
        
        // Clean Aging
        const aging = rawAging ? parseInt(rawAging.replace(/[^0-9]/g, '')) : 0;

        if (isNaN(balance)) continue;

        // Determine Status based on Aging
        let status: 'Current' | 'Overdue' | 'Impaired' = 'Current';
        if (aging > 30 && aging <= 90) status = 'Overdue';
        if (aging > 90) status = 'Impaired';

        data.push({
          id: `REC-${i}`,
          customerName: rawName || 'Unknown',
          totalBalance: balance,
          agingDays: isNaN(aging) ? 0 : aging,
          status,
          invoiceDate: rawDate || new Date().toISOString().split('T')[0]
        });
      }

      if (data.length === 0) {
        throw new Error("No valid records found. Please check your CSV format (Name, Balance, Aging, Date).");
      }
      
      onDataLoaded(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse CSV.");
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setError("Please upload a .csv or .txt file.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setTimeout(() => processCSV(text), 1000);
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    setIsProcessing(true);
    setError(null);
    const sampleCSV = `Customer Name,Total Balance,Aging Days,Invoice Date
PT. Maju Jaya,150000000,15,2023-10-01
CV. Sumber Rejeki,45000000,45,2023-09-01
Toko Abadi,12500000,120,2023-06-01
PT. Teknologi Baru,250000000,5,2023-10-10
UD. Sejahtera,8500000,200,2023-03-01
Global Corp,500000000,10,2023-10-05
Local Trader,-1500000,30,2023-09-15
Mega Construction,300000000,95,2023-07-01`;
    setTimeout(() => processCSV(sampleCSV), 1000);
  };

  const downloadTemplate = () => {
    const csvContent = `Customer Name,Total Balance,Aging Days,Invoice Date
PT. Contoh Pelanggan,15000000,30,2024-01-01
CV. Mitra Abadi,5000000,60,2023-12-01
Toko Sejahtera,25000000,120,2023-10-01
UD. Maju Terus,-500000,15,2024-01-15`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_kertas_kerja_audit.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full p-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-teal-400"></div>

        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          ) : (
            <FileUp className="w-10 h-10 text-primary-500" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Upload Working Paper (KKP)</h2>
        <p className="text-slate-400 mb-8 px-4">
          Upload your receivables ledger in <strong>.CSV</strong> format. <br/>
          <span className="text-xs text-slate-500">(Supports Comma or Semicolon delimiters)</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-sm text-left animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative group w-full mb-6">
          <input 
            type="file" 
            accept=".csv,.txt"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
          />
          <div className={`w-full py-8 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2
            ${error 
              ? 'border-red-800 bg-red-900/5' 
              : 'border-slate-700 bg-slate-800/30 group-hover:border-primary-500 group-hover:bg-slate-800/80'
            }
          `}>
             <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
               {isProcessing ? "Analyzing Data..." : "Click to Browse or Drag File"}
             </span>
             <span className="text-xs text-slate-500">Max file size: 5MB</span>
          </div>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-slate-500">Quick Actions</span>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <button 
            onClick={downloadTemplate}
            disabled={isProcessing}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white font-medium px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Template</span>
          </button>
          
          <button 
            onClick={loadSampleData}
            disabled={isProcessing}
            className="flex items-center space-x-2 text-sm text-primary-400 hover:text-primary-300 font-medium px-4 py-2 rounded-lg border border-slate-700 hover:bg-primary-500/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;