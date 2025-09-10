import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import styles from './FormulationsManagement.module.scss';

export default function ExcelUploadModal({ onUpload, onClose, uploading }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    setError('');
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      console.log('[ExcelUploadModal] Submitting file:', { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type });
      await onUpload(selectedFile);
      console.log('[ExcelUploadModal] onUpload resolved');
    } catch (err) {
      setError(err.message || 'Failed to upload file');
      console.error('[ExcelUploadModal] onUpload error:', err);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError('');
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Upload Formulation Excel File</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.uploadInfo}>
            <div className={styles.infoIcon}>
              <FileSpreadsheet size={48} />
            </div>
            <h4>Upload Formulation Data</h4>
            <p>
              Upload an Excel file containing formulation data. The system will automatically:
            </p>
            <ul>
              <li>Create missing chemicals in the chemicals table</li>
              <li>Create chemical products for manufactured items</li>
              <li>Create formulations linking products to components</li>
              <li>Set default stock quantities (0) for new chemicals</li>
            </ul>
          </div>
          
          <div 
            className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className={styles.fileInput}
            />
            
            <div className={styles.dropContent}>
              <Upload size={48} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                {dragActive ? 'Drop your file here' : 'Drag and drop your Excel file here'}
              </p>
              <p className={styles.dropSubtext}>or</p>
              <button 
                className={styles.browseBtn}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse Files
              </button>
              <p className={styles.fileTypes}>
                Supports: .xlsx, .xls, .csv (Max 5MB)
              </p>
            </div>
          </div>
          
          {selectedFile && (
            <div className={styles.fileSelected}>
              <div className={styles.fileInfo}>
                <FileSpreadsheet size={20} />
                <span className={styles.fileName}>{selectedFile.name}</span>
                <span className={styles.fileSize}>
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
          )}
          
          {error && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className={styles.modalActions}>
          <button 
            type="button" 
            className={styles.cancelBtn} 
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className={styles.uploadBtn}
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Parse'}
          </button>
        </div>
      </div>
    </div>
  );
}
