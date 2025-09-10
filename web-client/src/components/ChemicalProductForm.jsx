import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FlaskConical } from 'lucide-react';
import styles from './ChemicalProductForm.module.scss';

export default function ChemicalProductForm({ 
  product = null, 
  onSubmit, 
  onCancel, 
  title = "Chemical Product Form",
  chemicals = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    chemical_id: '',
    base_composition_qty: '',
    unit: 'g',
    note: ''
  });

  const [formulations, setFormulations] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        chemical_id: product.chemical_id || '',
        base_composition_qty: product.base_composition_qty || '',
        unit: product.unit || 'g',
        note: product.note || ''
      });
      // Load existing formulations if editing
      if (product.formulations) {
        setFormulations(product.formulations);
      }
    }
  }, [product]);

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

  const addFormulation = () => {
    setFormulations(prev => [...prev, {
      component_chemical_id: '',
      quantity_required: '',
      unit: 'g'
    }]);
  };

  const removeFormulation = (index) => {
    setFormulations(prev => prev.filter((_, i) => i !== index));
  };

  const updateFormulation = (index, field, value) => {
    setFormulations(prev => prev.map((form, i) => 
      i === index ? { ...form, [field]: value } : form
    ));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.chemical_id) {
      newErrors.chemical_id = 'Base chemical is required';
    }
    if (!formData.base_composition_qty || formData.base_composition_qty <= 0) {
      newErrors.base_composition_qty = 'Base composition quantity must be greater than 0';
    }
    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    // Validate formulations
    if (formulations.length === 0) {
      newErrors.formulations = 'At least one formulation component is required';
    } else {
      formulations.forEach((form, index) => {
        if (!form.component_chemical_id) {
          newErrors[`formulation_${index}`] = 'Component chemical is required';
        }
        if (!form.quantity_required || form.quantity_required <= 0) {
          newErrors[`formulation_${index}`] = 'Quantity must be greater than 0';
        }
        if (!form.unit) {
          newErrors[`formulation_${index}`] = 'Unit is required';
        }
      });
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
      formulations: formulations.map(form => ({
        component_chemical_id: parseInt(form.component_chemical_id),
        quantity_required: parseFloat(form.quantity_required),
        unit: form.unit
      }))
    };

    onSubmit(submitData);
  };

  const getAvailableChemicals = () => {
    return chemicals.filter(chem => chem.id !== parseInt(formData.chemical_id));
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
            <h4>Product Information</h4>
            
            <div className={styles.formGroup}>
              <label htmlFor="name">Product Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., OSR16124, WRCD9374"
                className={errors.name ? styles.error : ''}
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="chemical_id">Base Chemical *</label>
              <select
                id="chemical_id"
                name="chemical_id"
                value={formData.chemical_id}
                onChange={handleInputChange}
                className={errors.chemical_id ? styles.error : ''}
              >
                <option value="">Select a chemical</option>
                {chemicals.map(chem => (
                  <option key={chem.id} value={chem.id}>
                    {chem.name} ({chem.unit})
                  </option>
                ))}
              </select>
              {errors.chemical_id && <span className={styles.errorText}>{errors.chemical_id}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="base_composition_qty">Base Composition Quantity *</label>
                <input
                  type="number"
                  id="base_composition_qty"
                  name="base_composition_qty"
                  value={formData.base_composition_qty}
                  onChange={handleInputChange}
                  placeholder="e.g., 100.15"
                  step="0.01"
                  min="0"
                  className={errors.base_composition_qty ? styles.error : ''}
                />
                {errors.base_composition_qty && <span className={styles.errorText}>{errors.base_composition_qty}</span>}
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
              <label htmlFor="note">Notes</label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="Additional notes about this product..."
                rows="3"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h4>Formulation Components</h4>
              <button
                type="button"
                onClick={addFormulation}
                className={styles.addBtn}
              >
                <Plus size={16} /> Add Component
              </button>
            </div>

            {errors.formulations && (
              <span className={styles.errorText}>{errors.formulations}</span>
            )}

            {formulations.length === 0 ? (
              <div className={styles.emptyFormulations}>
                <p>No formulation components added yet.</p>
                <p>Click "Add Component" to start building the formulation.</p>
              </div>
            ) : (
              <div className={styles.formulationsList}>
                {formulations.map((form, index) => (
                  <div key={index} className={styles.formulationItem}>
                    <div className={styles.formulationHeader}>
                      <h5>Component {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeFormulation(index)}
                        className={styles.removeBtn}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className={styles.formulationFields}>
                      <div className={styles.formGroup}>
                        <label>Chemical Component *</label>
                        <select
                          value={form.component_chemical_id}
                          onChange={(e) => updateFormulation(index, 'component_chemical_id', e.target.value)}
                          className={errors[`formulation_${index}`] ? styles.error : ''}
                        >
                          <option value="">Select chemical</option>
                          {getAvailableChemicals().map(chem => (
                            <option key={chem.id} value={chem.id}>
                              {chem.name} ({chem.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Quantity Required *</label>
                          <input
                            type="number"
                            value={form.quantity_required}
                            onChange={(e) => updateFormulation(index, 'quantity_required', e.target.value)}
                            placeholder="e.g., 25.5"
                            step="0.01"
                            min="0"
                            className={errors[`formulation_${index}`] ? styles.error : ''}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Unit *</label>
                          <select
                            value={form.unit}
                            onChange={(e) => updateFormulation(index, 'unit', e.target.value)}
                            className={errors[`formulation_${index}`] ? styles.error : ''}
                          >
                            <option value="g">Grams (g)</option>
                            <option value="kg">Kilograms (kg)</option>
                            <option value="mg">Milligrams (mg)</option>
                            <option value="l">Liters (l)</option>
                            <option value="ml">Milliliters (ml)</option>
                            <option value="piece">Pieces</option>
                          </select>
                        </div>
                      </div>

                      {errors[`formulation_${index}`] && (
                        <span className={styles.errorText}>{errors[`formulation_${index}`]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Save size={16} /> {product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

