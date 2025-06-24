import React, { useState, useEffect } from 'react';
import styles from './FormulationForm.module.scss';

export default function FormulationForm({ formulation, chemicalId, onSubmit, onCancel, title }) {
  const [formData, setFormData] = useState({
    chemical_id: chemicalId || '',
    component_name: '',
    amount: 0,
    unit: '',
    available_quantity: 0,
    required_quantity: 0,
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formulation) {
      setFormData({
        chemical_id: formulation.chemical_id || chemicalId || '',
        component_name: formulation.component_name || '',
        amount: formulation.amount || 0,
        unit: formulation.unit || '',
        available_quantity: formulation.available_quantity || 0,
        required_quantity: formulation.required_quantity || 0,
        notes: formulation.notes || ''
      });
    } else if (chemicalId) {
      setFormData(prev => ({
        ...prev,
        chemical_id: chemicalId
      }));
    }
  }, [formulation, chemicalId]);

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
    
    if (!formData.component_name.trim()) {
      newErrors.component_name = 'Component name is required';
    }
    
    if (formData.amount < 0) {
      newErrors.amount = 'Amount must be non-negative';
    }
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (formData.available_quantity < 0) {
      newErrors.available_quantity = 'Available quantity must be non-negative';
    }
    
    if (formData.required_quantity < 0) {
      newErrors.required_quantity = 'Required quantity must be non-negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert numeric fields to numbers
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        available_quantity: parseFloat(formData.available_quantity),
        required_quantity: parseFloat(formData.required_quantity)
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
            <label htmlFor="component_name">Component Name *</label>
            <input
              type="text"
              id="component_name"
              name="component_name"
              value={formData.component_name}
              onChange={handleChange}
              className={errors.component_name ? styles.error : ''}
              placeholder="Enter component name"
            />
            {errors.component_name && <span className={styles.errorText}>{errors.component_name}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="amount">Amount *</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={errors.amount ? styles.error : ''}
                placeholder="0.00"
              />
              {errors.amount && <span className={styles.errorText}>{errors.amount}</span>}
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
              <label htmlFor="available_quantity">Available Quantity *</label>
              <input
                type="number"
                id="available_quantity"
                name="available_quantity"
                value={formData.available_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={errors.available_quantity ? styles.error : ''}
                placeholder="0.00"
              />
              {errors.available_quantity && <span className={styles.errorText}>{errors.available_quantity}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="required_quantity">Required Quantity *</label>
              <input
                type="number"
                id="required_quantity"
                name="required_quantity"
                value={formData.required_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={errors.required_quantity ? styles.error : ''}
                placeholder="0.00"
              />
              {errors.required_quantity && <span className={styles.errorText}>{errors.required_quantity}</span>}
            </div>
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
              {formulation ? 'Update Formulation' : 'Create Formulation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 