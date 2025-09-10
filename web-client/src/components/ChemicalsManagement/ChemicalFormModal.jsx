import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './ChemicalsManagement.module.scss';

export default function ChemicalFormModal({ chemical, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    available_qty: 0,
    threshold_qty: 0,
    is_manufactured: false
  });

  useEffect(() => {
    if (chemical) {
      setFormData({
        name: chemical.name || '',
        unit: chemical.unit || 'g',
        available_qty: chemical.available_qty || 0,
        threshold_qty: chemical.threshold_qty || 0,
        is_manufactured: chemical.is_manufactured || false
      });
    }
  }, [chemical]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    
    if (type === 'number') {
      processedValue = value === '' ? 0 : parseFloat(value);
      if (isNaN(processedValue)) processedValue = 0;
    } else if (type === 'checkbox') {
      processedValue = checked;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Edit Chemical: {chemical?.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Chemical Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled // Name cannot be changed once created
            />
            <small>Chemical name cannot be changed once created</small>
          </div>
          
          <div className={styles.formGroup}>
            <label>Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
            >
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="l">Liters (L)</option>
              <option value="ml">Milliliters (mL)</option>
            </select>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Available Quantity</label>
              <input
                type="number"
                name="available_qty"
                step="0.01"
                value={formData.available_qty}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Threshold Quantity</label>
              <input
                type="number"
                name="threshold_qty"
                step="0.01"
                value={formData.threshold_qty}
                onChange={handleInputChange}
                required
              />
              <small>Low stock alert will trigger when available quantity falls below this threshold</small>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                name="is_manufactured"
                checked={formData.is_manufactured}
                onChange={handleInputChange}
              />
              This is a manufactured chemical
            </label>
            <small>Manufactured chemicals are products that can be made from formulations</small>
          </div>
          
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Update Chemical
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
