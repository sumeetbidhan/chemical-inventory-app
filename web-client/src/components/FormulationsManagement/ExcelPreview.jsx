import React from 'react';
import { CheckCircle, AlertCircle, FileSpreadsheet, Save } from 'lucide-react';
import styles from './FormulationsManagement.module.scss';

export default function ExcelPreview({ data, onApprove, onCancel, uploading }) {
  if (!data) return null;

  const { product_name, total_quantity, components, new_chemicals, existing_chemicals } = data;

  return (
    <div className={styles.excelPreview}>
      <div className={styles.previewHeader}>
        <div className={styles.previewIcon}>
          <FileSpreadsheet size={32} />
        </div>
        <div className={styles.previewInfo}>
          <h3>Excel Data Preview</h3>
          <p>Review the parsed data before saving to the database</p>
        </div>
      </div>

      <div className={styles.previewContent}>
        {/* Product Summary */}
        <div className={styles.productSummary}>
          <h4>Product: {product_name}</h4>
          <div className={styles.summaryDetails}>
            <div className={styles.summaryItem}>
              <span className={styles.label}>Total Quantity:</span>
              <span className={styles.value}>{total_quantity}g</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.label}>Components:</span>
              <span className={styles.value}>{components.length}</span>
            </div>
          </div>
        </div>

        {/* New Chemicals to be Created */}
        {new_chemicals && new_chemicals.length > 0 && (
          <div className={styles.section}>
            <h4>
              <AlertCircle size={20} className={styles.alertIcon} />
              New Chemicals to be Created
            </h4>
            <div className={styles.chemicalsList}>
              {new_chemicals.map((chemical, index) => (
                <div key={index} className={styles.chemicalItem}>
                  <span className={styles.chemicalName}>{chemical.name}</span>
                  <span className={styles.chemicalQuantity}>{chemical.quantity}g</span>
                  <span className={styles.chemicalStatus}>New</span>
                </div>
              ))}
            </div>
            <p className={styles.infoText}>
              These chemicals don't exist in the database and will be automatically created with 0 stock.
            </p>
          </div>
        )}

        {/* Existing Chemicals */}
        {existing_chemicals && existing_chemicals.length > 0 && (
          <div className={styles.section}>
            <h4>
              <CheckCircle size={20} className={styles.checkIcon} />
              Existing Chemicals
            </h4>
            <div className={styles.chemicalsList}>
              {existing_chemicals.map((chemical, index) => (
                <div key={index} className={styles.chemicalItem}>
                  <span className={styles.chemicalName}>{chemical.name}</span>
                  <span className={styles.chemicalQuantity}>{chemical.quantity}g</span>
                  <span className={styles.chemicalStatus}>Existing</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Component Breakdown */}
        <div className={styles.section}>
          <h4>Component Breakdown</h4>
          <div className={styles.componentsTable}>
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Quantity</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {components.map((component, index) => (
                  <tr key={index}>
                    <td>{component.name}</td>
                    <td>{component.quantity}g</td>
                    <td>{((component.quantity / total_quantity) * 100).toFixed(2)}%</td>
                    <td>
                      <span className={`${styles.status} ${component.existing ? styles.existing : styles.new}`}>
                        {component.existing ? 'Existing' : 'New'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.previewActions}>
        <button 
          type="button" 
          className={styles.cancelBtn} 
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </button>
        <button 
          type="button" 
          className={styles.approveBtn}
          onClick={onApprove}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <div className={styles.spinner}></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save to Database
            </>
          )}
        </button>
      </div>
    </div>
  );
}

