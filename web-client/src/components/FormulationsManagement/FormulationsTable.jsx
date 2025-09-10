import React from 'react';
import { Trash2 } from 'lucide-react';
import styles from './FormulationsManagement.module.scss';

export default function FormulationsTable({ formulations, chemicalProducts, chemicals, loading, onDelete }) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading formulations...</p>
      </div>
    );
  }

  if (formulations.length === 0) {
    return (
      <div className={styles.noData}>
        <p>No formulations found.</p>
        <p>Upload an Excel file to create formulations and automatically create missing chemicals.</p>
      </div>
    );
  }

  // Helper function to get product name
  const getProductName = (productId) => {
    const product = chemicalProducts.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  // Helper function to get chemical name
  const getChemicalName = (chemicalId) => {
    const chemical = chemicals.find(c => c.id === chemicalId);
    return chemical ? chemical.name : 'Unknown Chemical';
  };

  // Helper function to get chemical details
  const getChemicalDetails = (chemicalId) => {
    const chemical = chemicals.find(c => c.id === chemicalId);
    return chemical || null;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Component Chemical</th>
            <th>Quantity Required</th>
            <th>Unit</th>
            <th>Component Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {formulations.map(formulation => {
            const componentChemical = getChemicalDetails(formulation.component_chemical_id);
            const isManufactured = componentChemical?.is_manufactured;
            
            return (
              <tr key={formulation.id}>
                <td>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>
                      {getProductName(formulation.product_id)}
                    </span>
                  </div>
                </td>
                <td>
                  <div className={styles.chemicalInfo}>
                    <span className={styles.chemicalName}>
                      {getChemicalName(formulation.component_chemical_id)}
                    </span>
                    {isManufactured && (
                      <span className={styles.manufacturedBadge}>Manufactured</span>
                    )}
                  </div>
                </td>
                <td>{formulation.quantity_required}</td>
                <td>{formulation.unit}</td>
                <td>
                  <div className={styles.componentStatus}>
                    {componentChemical ? (
                      <span className={styles.existingStatus}>✅ Existing</span>
                    ) : (
                      <span className={styles.missingStatus}>❌ Missing</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete this formulation?`)) {
                          onDelete(formulation.id);
                        }
                      }}
                      title="Delete Formulation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

