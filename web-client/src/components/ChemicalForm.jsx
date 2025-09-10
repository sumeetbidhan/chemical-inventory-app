import React, { useState, useEffect } from 'react';
import { X, Save, FlaskConical } from 'lucide-react';
import styles from './ChemicalForm.module.scss';

export default function ChemicalForm({ 
  chemical = null, 
  onSubmit, 
  onCancel, 
  title = "Chemical Form"
}) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    available_qty: '',
    threshold_qty: '',
    location: '',
    supplier: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const units = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'mg', label: 'Milligrams (mg)' },
    { value: 'l', label: 'Liters (L)' },
    { value: 'ml', label: 'Milliliters (mL)' },
    { value: 'count', label: 'Count' }
  ];

  useEffect(() => {
    if (chemical) {
      setFormData({
        name: chemical.name || '',
        unit: chemical.unit || 'g',
        available_qty: chemical.available_qty || '',
        threshold_qty: chemical.threshold_qty || '',
        location: chemical.location || '',
        supplier: chemical.supplier || '',
        notes: chemical.notes || ''
      });
    }
  }, [chemical]);

  const handleInputChange = (e) => {
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

    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    if (formData.available_qty === '' || parseFloat(formData.available_qty) < 0) {
      newErrors.available_qty = 'Available quantity must be a positive number';
    }

    if (formData.threshold_qty === '' || parseFloat(formData.threshold_qty) < 0) {
      newErrors.threshold_qty = 'Threshold quantity must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        available_qty: parseFloat(formData.available_qty),
        threshold_qty: parseFloat(formData.threshold_qty)
      });
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={20} />
              {title}
            </span>
          </h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h4>Basic Information</h4>
            
            <div className={styles.formGroup}>
              <label htmlFor="name">Chemical Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter chemical name"
                className={errors.name ? styles.inputError : ''}
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="unit">Unit *</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className={errors.unit ? styles.inputError : ''}
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              {errors.unit && <span className={styles.errorText}>{errors.unit}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="available_qty">Available Quantity *</label>
                <input
                  type="number"
                  id="available_qty"
                  name="available_qty"
                  value={formData.available_qty}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={errors.available_qty ? styles.inputError : ''}
                />
                {errors.available_qty && <span className={styles.errorText}>{errors.available_qty}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="threshold_qty">Threshold Quantity *</label>
                <input
                  type="number"
                  id="threshold_qty"
                  name="threshold_qty"
                  value={formData.threshold_qty}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={errors.threshold_qty ? styles.inputError : ''}
                />
                {errors.threshold_qty && <span className={styles.errorText}>{errors.threshold_qty}</span>}
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h4>Additional Details</h4>
            
            <div className={styles.formGroup}>
              <label htmlFor="location">Storage Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Storage A, Shelf B"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="supplier">Supplier</label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="Supplier name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about the chemical..."
                rows="3"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Save size={16} />
              {chemical ? 'Update Chemical' : 'Add Chemical'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 