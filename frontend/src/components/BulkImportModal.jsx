import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * BulkImportModal — reusable across Employees / Registrations / Admissions / Collections.
 *
 * Three states it walks through:
 *   1. PICK   — pick a file (drag-drop or click), download template
 *   2. UPLOAD — file selected, show name + size, "Upload" button
 *   3. RESULT — server response: inserted / failed / per-row errors
 *
 * Why a single component for all four resources: the only thing that changes
 * between them is the API endpoint and the human-readable resource name.
 * Everything else (UX, state machine, error display) is identical, so abstracting
 * it saves us from four near-duplicate files that would drift over time.
 *
 * Props:
 *   - open, onClose       — modal control
 *   - resource            — 'employees' | 'registrations' | 'admissions' | 'collections'
 *   - resourceLabel       — human label e.g. "Employees"
 *   - onSuccess           — callback after successful import (parent re-fetches list)
 */
export const BulkImportModal = ({ open, onClose, resource, resourceLabel, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    const isValid = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!isValid) {
      toast.error('Please pick a .xlsx, .xls, or .csv file');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File too large — max 5 MB');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/import/${resource}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      if (data.data.inserted > 0) {
        toast.success(`${data.data.inserted} record${data.data.inserted > 1 ? 's' : ''} imported`);
        onSuccess?.();
      }
      if (data.data.inserted === 0 && data.data.failed > 0) {
        toast.error('No rows imported — see errors below');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/import/template/${resource}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resource}-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Bulk Import ${resourceLabel}`} size="lg">
      <AnimatePresence mode="wait">
        {/* STATE 3: Result */}
        {result ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat label="Total rows" value={result.totalRows} color="default" />
              <ResultStat label="Imported" value={result.inserted} color="success" />
              <ResultStat label="Failed" value={result.failed} color={result.failed > 0 ? 'danger' : 'default'} />
            </div>

            {result.errors?.length > 0 && (
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/30 px-3 py-2">
                  <p className="text-sm font-medium">
                    Errors ({result.errors.length}
                    {result.errors.length === 100 && '+ — first 100 shown'})
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  <ul className="space-y-1">
                    {result.errors.map((err, i) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/30"
                      >
                        <span className="shrink-0 font-mono text-muted-foreground">
                          Row {err.row}:
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.inserted > 0 && result.failed === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>All rows imported successfully!</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Import another file</Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </motion.div>
        ) : file ? (
          /* STATE 2: File selected */
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Make sure your file uses the template column names. Invalid rows will be reported
                individually — valid rows will still import.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFile(null)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Import
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          /* STATE 1: Pick a file */
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">First time? Download the template</p>
                <p className="text-xs text-muted-foreground">
                  Use the exact column headers — extra columns are ignored
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/30'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop your file here or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv (max 5 MB)
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

const ResultStat = ({ label, value, color }) => {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
};
