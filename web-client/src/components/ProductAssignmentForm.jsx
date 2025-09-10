import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Users, FlaskConical } from 'lucide-react';
import styles from './ProductAssignmentForm.module.scss';

export default function ProductAssignmentForm({ 
  onSubmit, 
  onCancel, 
  title = "Assign Product to Team Member",
  products = [],
  users = []
}) {
  const [formData, setFormData] = useState({
    product_id: '',
    assigned_to_user_id: '',
    quantity_requested: '',
    unit: 'g',
    time_allotted_minutes: ''
  });

  const [errors, setErrors] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [autoTeamType, setAutoTeamType] = useState('');

  useEffect(() => {
    if (formData.product_id) {
      const product = products.find(p => p.id === parseInt(formData.product_id));
      setSelectedProduct(product);
      
      // Auto-calculate team type based on quantity
      if (formData.quantity_requested && formData.unit) {
        const quantityKg = convertToKg(parseFloat(formData.quantity_requested), formData.unit);
        setAutoTeamType(quantityKg < 2.0 ? 'LAB_STAFF' : 'PRODUCT_TEAM');
      }
    }
  }, [formData.product_id, formData.quantity_requested, formData.unit, products]);

  const convertToKg = (quantity, unit) => {
    switch (unit.toLowerCase()) {
      case 'kg':
        return quantity;
      case 'g':
        return quantity / 1000.0;
      case 'mg':
        return quantity / 1000000.0;
      case 'lb':
        return quantity * 0.453592;
      case 'oz':
        return quantity * 0.0283495;
      default:
        return 0.5; // Assume small quantities for other units
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (!formData.assigned_to_user_id) {
      newErrors.assigned_to_user_id = 'Team member is required';
    }
    if (!formData.quantity_requested || formData.quantity_requested <= 0) {
      newErrors.quantity_requested = 'Quantity must be greater than 0';
    }
    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }
    if (!formData.time_allotted_minutes || formData.time_allotted_minutes <= 0) {
      newErrors.time_allotted_minutes = 'Time limit must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      product_id: parseInt(formData.product_id),
      assigned_to_user_id: parseInt(formData.assigned_to_user_id),
      quantity_requested: parseFloat(formData.quantity_requested),
      time_allotted_minutes: parseInt(formData.time_allotted_minutes)
    };

    onSubmit(submitData);
  };

  const getTeamMembers = () => {
    return users.filter(user => 
      ['lab_staff', 'product', 'LAB', 'PRODUCT'].includes(user.role?.name || user.role)
    );
  };

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} />
              {title}
            </span>
          </h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h4>Assignment Details</h4>
            
            <div className={styles.formGroup}>
              <label htmlFor="product_id">Chemical Product *</label>
              <select
                id="product_id"
                name="product_id"
                value={formData.product_id}
                onChange={handleInputChange}
                className={errors.product_id ? styles.error : ''}
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.base_composition_qty} {product.unit})
                  </option>
                ))}
              </select>
              {errors.product_id && <span className={styles.errorText}>{errors.product_id}</span>}
            </div>

            {selectedProduct && (
              <div className={styles.productInfo}>
                <h5>Product Information</h5>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Base Composition:</span>
                    <span className={styles.value}>
                      {selectedProduct.base_composition_qty} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Base Chemical:</span>
                    <span className={styles.value}>
                      {selectedProduct.chemical?.name || 'N/A'}
                    </span>
                  </div>
                  {selectedProduct.note && (
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Notes:</span>
                      <span className={styles.value}>{selectedProduct.note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="assigned_to_user_id">Assign To Team Member *</label>
              <select
                id="assigned_to_user_id"
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleInputChange}
                className={errors.assigned_to_user_id ? styles.error : ''}
              >
                <option value="">Select team member</option>
                {getTeamMembers().map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name || ''} ({user.role?.name || user.role})
                  </option>
                ))}
              </select>
              {errors.assigned_to_user_id && <span className={styles.errorText}>{errors.assigned_to_user_id}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="quantity_requested">Quantity Requested *</label>
                <input
                  type="number"
                  id="quantity_requested"
                  name="quantity_requested"
                  value={formData.quantity_requested}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  step="0.01"
                  min="0"
                  className={errors.quantity_requested ? styles.error : ''}
                />
                {errors.quantity_requested && <span className={styles.errorText}>{errors.quantity_requested}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="unit">Unit *</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className={errors.unit ? styles.error : ''}
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="mg">Milligrams (mg)</option>
                  <option value="l">Liters (l)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="piece">Pieces</option>
                </select>
                {errors.unit && <span className={styles.errorText}>{errors.unit}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="time_allotted_minutes">Time Limit *</label>
              <div className={styles.timeInputGroup}>
                <input
                  type="number"
                  id="time_allotted_minutes"
                  name="time_allotted_minutes"
                  value={formData.time_allotted_minutes}
                  onChange={handleInputChange}
                  placeholder="e.g., 120"
                  min="1"
                  className={errors.time_allotted_minutes ? styles.error : ''}
                />
                <span className={styles.timeUnit}>minutes</span>
              </div>
              {formData.time_allotted_minutes && (
                <span className={styles.timeDisplay}>
                  <Clock size={14} /> {formatTime(parseInt(formData.time_allotted_minutes))}
                </span>
              )}
              {errors.time_allotted_minutes && <span className={styles.errorText}>{errors.time_allotted_minutes}</span>}
            </div>
          </div>

          {autoTeamType && (
            <div className={styles.formSection}>
              <h4>Team Assignment Logic</h4>
              <div className={styles.teamLogic}>
                <div className={styles.logicCard}>
                  <div className={styles.logicHeader}>
                    <span className={styles.logicIcon}>
                      <FlaskConical size={16} />
                    </span>
                    <span className={styles.logicTitle}>Auto-Assigned Team</span>
                  </div>
                  <div className={styles.logicContent}>
                    <p>
                      <strong>Quantity:</strong> {formData.quantity_requested} {formData.unit} 
                      ({convertToKg(parseFloat(formData.quantity_requested), formData.unit).toFixed(3)} kg)
                    </p>
                    <p>
                      <strong>Team:</strong> 
                      <span className={`${styles.teamBadge} ${styles[autoTeamType.toLowerCase()]}`}>
                        {autoTeamType === 'LAB_STAFF' ? 'Lab Staff' : 'Product Team'}
                      </span>
                    </p>
                    <p className={styles.logicRule}>
                      {autoTeamType === 'LAB_STAFF' 
                        ? 'Small quantities (< 2kg) are handled by lab technicians for precise measurements'
                        : 'Large quantities (≥ 2kg) are managed by product specialists for bulk operations'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Save size={16} /> Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

