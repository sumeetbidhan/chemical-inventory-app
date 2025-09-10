import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Eye } from 'lucide-react';
import ExcelUploadModal from './ExcelUploadModal';
import ExcelPreview from './ExcelPreview';
import FormulationsTable from './FormulationsTable';
import styles from './FormulationsManagement.module.scss';

export default function FormulationsManagement({ 
  formulations, 
  chemicalProducts,
  chemicals,
  loading, 
  onRefresh,
  onExcelUpload,
  onExcelApprove,
  onDeleteFormulation
}) {
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelData, setExcelPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleExcelUpload = async (file) => {
    try {
      setUploading(true);
      const result = await onExcelUpload(file);
      setExcelPreview(result.parsed_data);
      setExcelData(result.parsed_data);
      setShowExcelUpload(false);
    } catch (err) {
      console.error('Error uploading Excel:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleExcelApprove = async () => {
    if (!excelData) return;
    
    try {
      setUploading(true);
      await onExcelApprove(excelData);
      setExcelPreview(null);
      setExcelData(null);
    } catch (err) {
      console.error('Error approving Excel:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleExcelCancel = () => {
    setExcelPreview(null);
    setExcelData(null);
  };

  return (
    <div className={styles.formulationsManagement}>
      <div className={styles.tabHeader}>
        <h2>Formulations Management</h2>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={loading}
          >
            <Eye size={20} />
            View Formulations
          </button>
          <button 
            className={styles.uploadBtn}
            onClick={() => setShowExcelUpload(true)}
          >
            <Upload size={20} />
            Upload Excel
          </button>
        </div>
      </div>
      
      {/* Excel Preview */}
      {excelPreview && (
        <ExcelPreview
          data={excelPreview}
          onApprove={handleExcelApprove}
          onCancel={handleExcelCancel}
          uploading={uploading}
        />
      )}
      
      {/* Formulations Table */}
      <FormulationsTable 
        formulations={formulations}
        chemicalProducts={chemicalProducts}
        chemicals={chemicals}
        loading={loading}
        onDelete={onDeleteFormulation}
      />
      
      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <ExcelUploadModal
          onUpload={handleExcelUpload}
          onClose={() => setShowExcelUpload(false)}
          uploading={uploading}
        />
      )}
    </div>
  );
}
