import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import styles from './ChemicalsManagement.module.scss';

export default function ChemicalsTable({ chemicals, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading chemicals...</p>
      </div>
    );
  }

  if (chemicals.length === 0) {
    return (
      <div className={styles.noData}>
        <p>No chemicals found.</p>
        <p>Chemicals will be automatically created when you upload formulation Excel files.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Available Qty</th>
            <th>Threshold Qty</th>
            <th>Category</th>
            <th>Stock Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {chemicals.map(chemical => (
            <tr key={chemical.id}>
              <td>
                <div className={styles.chemicalName}>
                  <span className={styles.name}>{chemical.name}</span>
                  {chemical.is_manufactured && (
                    <span className={styles.manufacturedBadge}>Manufactured</span>
                  )}
                </div>
              </td>
              <td>{chemical.unit}</td>
              <td>{chemical.available_qty}</td>
              <td>{chemical.threshold_qty}</td>
              <td>
                {chemical.is_manufactured ? 'Manufactured' : 'Raw Material'}
              </td>
              <td>
                <div className={styles.stockStatus}>
                  {chemical.available_qty <= chemical.threshold_qty ? (
                    <span className={styles.lowStock}>⚠️ Low Stock</span>
                  ) : (
                    <span className={styles.inStock}>✅ In Stock</span>
                  )}
                </div>
              </td>
              <td>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.editBtn}
                    onClick={() => onEdit(chemical)}
                    title="Edit Chemical"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete(chemical)}
                    title="Delete Chemical"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

