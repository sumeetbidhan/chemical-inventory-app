import React, { useState, useEffect } from 'react';
import { X, Search, Clock, Users, Scale, CheckCircle } from 'lucide-react';
import styles from './AssignmentFormModal.module.scss';

const AssignmentFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  products = [], 
  users = [],
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    productId: '',
    targetQuantity: '',
    targetUnit: 'g',
    assignedToId: '',
    timeLimit: 60, // minutes
    otp: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [teamType, setTeamType] = useState('');

  // Filter products based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  // Determine team type based on quantity
  useEffect(() => {
    if (formData.targetQuantity && formData.targetUnit) {
      const quantity = parseFloat(formData.targetQuantity);
      const unit = formData.targetUnit;
      
      // Convert to grams for comparison
      let quantityInGrams = quantity;
      if (unit === 'kg') {
        quantityInGrams = quantity * 1000;
      }
      
      // Lab staff for smaller quantities (< 1000g), Product staff for larger
      if (quantityInGrams < 1000) {
        setTeamType('lab');
        setAvailableUsers(users.filter(user => user.role_name === 'Lab Staff'));
      } else {
        setTeamType('product');
        setAvailableUsers(users.filter(user => user.role_name === 'Product Staff'));
      }
    } else {
      setAvailableUsers([]);
      setTeamType('');
    }
  }, [formData.targetQuantity, formData.targetUnit, users]);

  // Generate OTP
  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, otp }));
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, productId: product.id }));
    setSearchTerm(product.name);
    setFilteredProducts([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }
    
    if (!formData.assignedToId) {
      alert('Please select a team member');
      return;
    }
    
    if (!formData.otp) {
      alert('Please generate an OTP');
      return;
    }

    const assignmentData = {
      ...formData,
      productName: selectedProduct.name,
      assignedToName: availableUsers.find(u => u.id === parseInt(formData.assignedToId))?.name,
      teamType,
      baseComposition: selectedProduct.base_composition_qty,
      baseUnit: selectedProduct.unit
    };

    onSubmit(assignmentData);
  };

  const handleClose = () => {
    setFormData({
      productId: '',
      targetQuantity: '',
      targetUnit: 'g',
      assignedToId: '',
      timeLimit: 60,
      otp: ''
    });
    setSearchTerm('');
    setSelectedProduct(null);
    setFilteredProducts([]);
    setAvailableUsers([]);
    setTeamType('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Assign Product Formulation</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Product Search */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <Search size={16} />
              Search Product
            </label>
            <div className={styles.searchContainer}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type product name to search..."
                className={styles.searchInput}
              />
              {filteredProducts.length > 0 && (
                <div className={styles.searchResults}>
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={styles.searchResult}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className={styles.productName}>{product.name}</div>
                      <div className={styles.productDetails}>
                        Base: {product.base_composition_qty} {product.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className={styles.selectedProduct}>
                <CheckCircle size={16} className={styles.checkIcon} />
                <span>Selected: {selectedProduct.name}</span>
              </div>
            )}
          </div>

          {/* Target Quantity and Unit */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Scale size={16} />
                Target Quantity
              </label>
              <input
                type="number"
                value={formData.targetQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, targetQuantity: e.target.value }))}
                placeholder="Enter quantity"
                min="0"
                step="0.01"
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Unit</label>
              <select
                value={formData.targetUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUnit: e.target.value }))}
                className={styles.select}
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
          </div>

          {/* Team Type Display */}
          {teamType && (
            <div className={styles.teamInfo}>
              <div className={`${styles.teamBadge} ${styles[teamType]}`}>
                <Users size={16} />
                {teamType === 'lab' ? 'Lab Staff' : 'Product Staff'} Required
                <span className={styles.teamReason}>
                  ({formData.targetQuantity} {formData.targetUnit} {teamType === 'lab' ? '< 1kg' : '≥ 1kg'})
                </span>
              </div>
            </div>
          )}

          {/* Team Member Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <Users size={16} />
              Assign To
            </label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData(prev => ({ ...prev, assignedToId: e.target.value }))}
              required
              className={styles.select}
              disabled={availableUsers.length === 0}
            >
              <option value="">
                {availableUsers.length === 0 ? 'No available team members' : 'Select team member'}
              </option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Time Limit */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <Clock size={16} />
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={formData.timeLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              min="15"
              max="480"
              required
              className={styles.input}
            />
            <div className={styles.helpText}>
              Minimum 15 minutes, maximum 8 hours
            </div>
          </div>

          {/* OTP Generation */}
          <div className={styles.formGroup}>
            <label className={styles.label}>OTP for Access</label>
            <div className={styles.otpContainer}>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value }))}
                placeholder="6-digit OTP"
                maxLength="6"
                required
                className={styles.otpInput}
              />
              <button
                type="button"
                onClick={generateOTP}
                className={styles.generateBtn}
              >
                Generate
              </button>
            </div>
            <div className={styles.helpText}>
              Share this OTP with the assigned team member for access
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProduct || !formData.assignedToId || !formData.otp}
              className={styles.submitBtn}
            >
              {loading ? 'Creating Assignment...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentFormModal;

