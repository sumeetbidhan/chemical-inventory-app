import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './ExcelUploadForm.module.scss';

export default function ExcelUploadForm({ 
  onUpload, 
  onCancel, 
  title = "Excel Upload"
}) {
  const [uploadType, setUploadType] = useState('chemicals');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errors, setErrors] = useState({});

  const uploadTypes = [
    { value: 'chemicals', label: 'Chemicals', description: 'Upload raw chemicals with quantities and thresholds' },
    { value: 'products', label: 'Chemical Products', description: 'Upload manufactured products with base compositions' },
    { value: 'formulations', label: 'Formulations', description: 'Upload product formulations with component details' }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        setErrors({ file: 'Please select a valid Excel file (.xlsx, .xls) or CSV file' });
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setErrors({});
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrors({ file: 'Please select a file to upload' });
      return;
    }

    setUploading(true);
    setErrors({});

    try {
      const result = await onUpload(file, uploadType);
      setUploadResult({
        success: true,
        message: `Successfully uploaded ${uploadType}!`,
        details: result
      });
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Upload failed',
        details: error.message || 'An error occurred during upload'
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templates = {
      chemicals: {
        filename: 'chemicals_template.xlsx',
        description: 'Template for uploading chemicals with columns: name, unit, quantity, threshold, location, supplier, notes'
      },
      products: {
        filename: 'products_template.xlsx',
        description: 'Template for uploading chemical products with columns: name, chemical_id, base_composition_qty, unit, notes'
      },
      formulations: {
        filename: 'formulations_template.xlsx',
        description: 'Template for uploading formulations with columns: product_id, component_chemical_id, quantity_required, unit'
      }
    };

    const template = templates[uploadType];
    
    // Create a simple CSV template (in a real app, you'd generate an actual Excel file)
    const csvContent = getTemplateContent(uploadType);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename.replace('.xlsx', '.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getTemplateContent = (type) => {
    switch (type) {
      case 'chemicals':
        return 'name,unit,quantity,threshold,location,supplier,notes\nSodium Chloride,g,1000,100,Storage A,Supplier A,Common salt\n';
      case 'products':
        return 'name,chemical_id,base_composition_qty,unit,notes\nOSR16124,1,100.15,g,Product A\n';
      case 'formulations':
        return 'product_id,component_chemical_id,quantity_required,unit\n1,2,25.5,g\n';
      default:
        return '';
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    setErrors({});
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} />
              {title}
            </span>
          </h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {!uploadResult ? (
            <>
              <div className={styles.uploadTypeSection}>
                <h4>Select Upload Type</h4>
                <div className={styles.uploadTypeGrid}>
                  {uploadTypes.map(type => (
                    <div
                      key={type.value}
                      className={`${styles.uploadTypeCard} ${uploadType === type.value ? styles.selected : ''}`}
                      onClick={() => setUploadType(type.value)}
                    >
                      <div className={styles.typeHeader}>
                        <input
                          type="radio"
                          name="uploadType"
                          value={type.value}
                          checked={uploadType === type.value}
                          onChange={() => setUploadType(type.value)}
                        />
                        <span className={styles.typeLabel}>{type.label}</span>
                      </div>
                      <p className={styles.typeDescription}>{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.templateSection}>
                <h4>Download Template</h4>
                <p>Download the appropriate template file to ensure your data is formatted correctly.</p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className={styles.downloadBtn}
                >
                  <Download size={16} /> Download {uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} Template
                </button>
              </div>

              <div className={styles.fileUploadSection}>
                <h4>Upload File</h4>
                <div className={styles.fileUploadArea}>
                  <input
                    type="file"
                    id="fileInput"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                  />
                  <label htmlFor="fileInput" className={styles.fileLabel}>
                    <Upload size={24} />
                    <span className={styles.uploadText}>
                      {file ? file.name : 'Choose file or drag and drop'}
                    </span>
                    <span className={styles.fileTypes}>
                      Excel (.xlsx, .xls) or CSV files only
                    </span>
                  </label>
                </div>
                {errors.file && <span className={styles.errorText}>{errors.file}</span>}
              </div>

              <div className={styles.uploadInfo}>
                <h4>Upload Guidelines</h4>
                <ul>
                  <li>Ensure your file follows the template format exactly</li>
                  <li>All required fields must be filled</li>
                  <li>Chemical names must be unique</li>
                  <li>Quantities must be positive numbers</li>
                  <li>Units must match the system's supported units</li>
                </ul>
              </div>
            </>
          ) : (
            <div className={styles.uploadResult}>
              <div className={`${styles.resultIcon} ${uploadResult.success ? styles.success : styles.error}`}>
                {uploadResult.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
              </div>
              <h4 className={uploadResult.success ? styles.successText : styles.errorText}>
                {uploadResult.message}
              </h4>
              <p className={styles.resultDetails}>{uploadResult.details}</p>
              
              {uploadResult.success && (
                <div className={styles.successActions}>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={styles.uploadAnotherBtn}
                  >
                    Upload Another File
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className={styles.closeBtn}
                  >
                    Close
                  </button>
                </div>
              )}
              
              {!uploadResult.success && (
                <div className={styles.errorActions}>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={styles.tryAgainBtn}
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className={styles.closeBtn}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}

          {!uploadResult && (
            <div className={styles.formActions}>
              <button type="button" onClick={onCancel} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className={styles.uploadBtn}
              >
                {uploading ? (
                  <>
                    <div className={styles.spinner}></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload {uploadType.charAt(0).toUpperCase() + uploadType.slice(1)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

