import React, { useState, useEffect } from 'react';
import styles from './ChemicalForm.module.scss';

export default function ChemicalForm({ chemical, onSubmit, onCancel, title }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    unit: '',
    formulation: '',
    notes: '',
    alert_threshold: 10,
    supplier: '',
    location: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (chemical) {
      setFormData({
        name: chemical.name || '',
        quantity: chemical.quantity || 0,
        unit: chemical.unit || '',
        formulation: chemical.formulation || '',
        notes: chemical.notes || '',
        alert_threshold: chemical.alert_threshold || 10,
        supplier: chemical.supplier || '',
        location: chemical.location || ''
      });
    }
  }, [chemical]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Chemical name is required';
    }
    
    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity must be non-negative';
    }
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (formData.alert_threshold < 0) {
      newErrors.alert_threshold = 'Alert threshold must be non-negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert quantity and alert_threshold to numbers
      const submitData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        alert_threshold: parseFloat(formData.alert_threshold)
      };
      onSubmit(submitData);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button onClick={onCancel} className={styles.closeBtn}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Chemical Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? styles.error : ''}
              placeholder="Enter chemical name"
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={errors.quantity ? styles.error : ''}
                placeholder="0.00"
              />
              {errors.quantity && <span className={styles.errorText}>{errors.quantity}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="unit">Unit *</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className={errors.unit ? styles.error : ''}
              >
                <option value="">Select unit</option>
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="mg">Milligrams (mg)</option>
                <option value="L">Liters (L)</option>
                <option value="mL">Milliliters (mL)</option>
                <option value="mol">Moles (mol)</option>
                <option value="mmol">Millimoles (mmol)</option>
                <option value="pieces">Pieces</option>
                <option value="bottles">Bottles</option>
                <option value="vials">Vials</option>
                <option value="other">Other</option>
              </select>
              {errors.unit && <span className={styles.errorText}>{errors.unit}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="alert_threshold">Alert Threshold</label>
              <input
                type="number"
                id="alert_threshold"
                name="alert_threshold"
                value={formData.alert_threshold}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={errors.alert_threshold ? styles.error : ''}
                placeholder="10"
              />
              <small>Quantity at which low stock alerts are triggered</small>
              {errors.alert_threshold && <span className={styles.errorText}>{errors.alert_threshold}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">Storage Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Lab A, Shelf 3"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="supplier">Supplier</label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="Enter supplier name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="formulation">Formulation</label>
            <textarea
              id="formulation"
              name="formulation"
              value={formData.formulation}
              onChange={handleChange}
              rows={4}
              placeholder="Enter formulation details..."
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Enter any additional notes..."
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              {chemical ? 'Update Chemical' : 'Create Chemical'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 