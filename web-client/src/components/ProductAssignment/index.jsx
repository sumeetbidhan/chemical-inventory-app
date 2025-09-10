import React, { useState } from 'react';
import { Search, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import AssignmentFormModal from './AssignmentFormModal';
import LiveTracking from './LiveTracking';
import styles from './ProductAssignment.module.scss';

export default function ProductAssignment({ 
  activeAssignments, 
  chemicalProducts,
  formulations,
  users,
  loading, 
  onRefresh,
  onCreateAssignment,
  onUpdateAssignment,
  onExtendTimer
}) {
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter products based on search
  const filteredProducts = chemicalProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get formulations for a product
  const getProductFormulations = (productId) => {
    return formulations.filter(f => f.product_id === productId);
  };

  // Get team assignment logic
  const getTeamAssignment = (product) => {
    const baseQty = product.base_composition_qty || 0;
    if (baseQty < 2000) { // Less than 2kg
      return { team: 'Lab Staff', color: '#3b82f6' };
    } else {
      return { team: 'Product Team', color: '#10b981' };
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setShowAssignmentForm(true);
  };

  const handleCloseForm = () => {
    setShowAssignmentForm(false);
    setSelectedProduct(null);
  };

  return (
    <div className={styles.productAssignment}>
      <div className={styles.tabHeader}>
        <h2>Product Assignment & Live Tracking</h2>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={loading}
          >
            <Clock size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Products */}
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search for chemical products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <p className={styles.searchInfo}>
          Search for products to assign to team members. Team assignment is automatic based on quantity.
        </p>
      </div>

      {/* Products Grid */}
      <div className={styles.productsGrid}>
        {filteredProducts.map(product => {
          const teamInfo = getTeamAssignment(product);
          const productFormulations = getProductFormulations(product.id);
          
          return (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.productHeader}>
                <h3>{product.name}</h3>
                <span 
                  className={styles.teamBadge}
                  style={{ backgroundColor: teamInfo.color }}
                >
                  {teamInfo.team}
                </span>
              </div>
              
              <div className={styles.productDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Base Composition:</span>
                  <span className={styles.value}>{product.base_composition_qty}g</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Formulations:</span>
                  <span className={styles.value}>{productFormulations.length}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Unit:</span>
                  <span className={styles.value}>{product.unit}</span>
                </div>
              </div>

              {productFormulations.length > 0 && (
                <div className={styles.formulationsPreview}>
                  <h4>Component Chemicals:</h4>
                  <div className={styles.componentsList}>
                    {productFormulations.slice(0, 3).map((formulation, index) => (
                      <span key={index} className={styles.component}>
                        {formulation.quantity_required}g
                      </span>
                    ))}
                    {productFormulations.length > 3 && (
                      <span className={styles.moreComponents}>
                        +{productFormulations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.productActions}>
                <button
                  className={styles.assignBtn}
                  onClick={() => handleProductSelect(product)}
                >
                  <Users size={16} />
                  Assign to Team
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Products Message */}
      {filteredProducts.length === 0 && searchTerm && (
        <div className={styles.noResults}>
          <p>No products found matching "{searchTerm}"</p>
          <p>Try a different search term or upload formulations first.</p>
        </div>
      )}

      {/* Active Assignments Live Tracking */}
      {activeAssignments && activeAssignments.length > 0 && (
        <LiveTracking
          assignments={activeAssignments}
          onUpdateAssignment={onUpdateAssignment}
          onExtendTimer={onExtendTimer}
        />
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <AssignmentFormModal
          product={selectedProduct}
          users={users}
          onSubmit={onCreateAssignment}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

