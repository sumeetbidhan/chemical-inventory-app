import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Upload, Download, Clock, CheckCircle, XCircle, Users, RefreshCw, X, Play, Pause, RotateCcw } from 'lucide-react';
import styles from './AssignmentSystem.module.scss';

// Assignment Form Modal Component
export const AssignmentFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  products = [], 
  users = [],
  formulations = [],
  chemicals = [],
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    productId: '',
    targetQuantity: '',
    targetUnit: 'g',
    assignedToId: '',
    timeLimit: 60,
    otp: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [teamType, setTeamType] = useState('');

  // Get formulation components for a product
  const getFormulationComponents = (productId) => {
    console.log('🔍 getFormulationComponents called for product ID:', productId);
    console.log('📦 Available formulations:', formulations);
    console.log('🧪 Available chemicals:', chemicals);
    
    const productFormulations = formulations.filter(f => f.product_id === productId);
    console.log('🧪 Found formulations for product:', productFormulations);
    
    const components = productFormulations.map(f => {
      const chemical = chemicals.find(c => c.id === f.component_chemical_id);
      console.log(`🔍 Looking for chemical ID ${f.component_chemical_id}:`, chemical);
      return {
        id: f.id,
        chemical_name: chemical?.name || `Chemical ${f.component_chemical_id}`,
        quantity_required: f.quantity_required,
        unit: f.unit
      };
    });
    
    console.log('✅ Final components:', components);
    return components;
  };

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
    console.log('🔍 AssignmentSystem Debug:', {
      targetQuantity: formData.targetQuantity,
      targetUnit: formData.targetUnit,
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role_name })),
      availableRoles: [...new Set(users.map(u => u.role_name))]
    });

    if (formData.targetQuantity && formData.targetUnit) {
      const quantity = parseFloat(formData.targetQuantity);
      const unit = formData.targetUnit;
      
      // Convert to grams for comparison
      let quantityInGrams = quantity;
      if (unit === 'kg') {
        quantityInGrams = quantity * 1000;
      }
      
      console.log('📊 Quantity Analysis:', {
        quantity,
        unit,
        quantityInGrams,
        threshold: 2000,
        isLabStaff: quantityInGrams < 2000
      });
      
      // Lab staff for smaller quantities (< 2000g), Product staff for larger (≥ 2000g)
      if (quantityInGrams < 2000) {
        setTeamType('lab');
        // Filter for LAB role users
        const labUsers = users.filter(user => user.role_name === 'LAB');
        console.log('🧪 Lab Staff Users:', labUsers);
        setAvailableUsers(labUsers);
      } else {
        setTeamType('product');
        // Use the actual role name from the database: 'PRODUCT'
        const productUsers = users.filter(user => user.role_name === 'PRODUCT');
        console.log('🏭 Product Team Users:', productUsers);
        setAvailableUsers(productUsers);
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

    const assignedUser = availableUsers.find(u => u.id === parseInt(formData.assignedToId));
    
    // Backend will handle formulation scaling automatically
    console.log('🔍 Creating assignment for product ID:', selectedProduct.id);
    console.log('📊 Target quantity:', formData.targetQuantity, formData.targetUnit);
    
    const assignmentData = {
      ...formData,
      product_name: selectedProduct.name,
      assigned_to_id: parseInt(formData.assignedToId),
      assigned_to_name: assignedUser ? 
        `${assignedUser.first_name} ${assignedUser.last_name || ''}`.trim() : 'Unknown User',
      teamType,
      baseComposition: selectedProduct.base_composition_qty,
      baseUnit: selectedProduct.unit,
      target_quantity: formData.targetQuantity,
      target_unit: formData.targetUnit
      // Backend will handle components and scaling automatically
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
                <Clock size={16} />
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
                  ({formData.targetQuantity} {formData.targetUnit} {teamType === 'lab' ? '< 2kg' : '≥ 2kg'})
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
                  {user.first_name} {user.last_name} ({user.role_name})
                </option>
              ))}
            </select>
            
            {/* Debug Information */}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Debug: {users.length} total users, {availableUsers.length} available users
              {teamType && <span> | Team: {teamType}</span>}
              {formData.targetQuantity && <span> | Qty: {formData.targetQuantity} {formData.targetUnit}</span>}
              <br />
              All users: {users.map(u => `${u.first_name} ${u.last_name} (${u.role_name})`).join(', ')}
            </div>
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

// Formulation Progress Component for assigned users
export const FormulationProgress = ({ 
  assignment, 
  onUpdateProgress, 
  onComplete,
  onRequestExtension 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedComponents, setCompletedComponents] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize time remaining
  useEffect(() => {
    if (assignment?.time_limit) {
      setTimeRemaining(assignment.time_limit * 60); // Convert minutes to seconds
    }
  }, [assignment]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setIsRunning(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining]);

  // Check if all components are completed
  useEffect(() => {
    if (assignment?.components && completedComponents.size === assignment.components.length) {
      setIsCompleted(true);
    }
  }, [completedComponents, assignment]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleComponent = (componentId) => {
    const newCompleted = new Set(completedComponents);
    if (newCompleted.has(componentId)) {
      newCompleted.delete(componentId);
    } else {
      newCompleted.add(componentId);
    }
    setCompletedComponents(newCompleted);
    
    // Update progress in parent component
    if (onUpdateProgress) {
      onUpdateProgress(assignment.id, componentId, newCompleted.has(componentId));
    }
  };

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeRemaining(assignment.time_limit * 60);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(assignment.id);
    }
  };

  const handleRequestExtension = () => {
    if (onRequestExtension) {
      onRequestExtension(assignment.id);
    }
  };

  if (!assignment) {
    return (
      <div className={styles.container}>
        <div className={styles.noAssignment}>
          <h3>No Active Assignment</h3>
          <p>You don't have any active formulation assignments.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = assignment.components 
    ? (completedComponents.size / assignment.components.length) * 100 
    : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.productInfo}>
          <h2>{assignment.product_name}</h2>
          <div className={styles.targetInfo}>
            Target: {assignment.target_quantity} {assignment.target_unit}
          </div>
        </div>
        <div className={styles.statusBadge}>
          {isCompleted ? 'Completed' : 'In Progress'}
        </div>
      </div>

      {/* Timer Section */}
      <div className={styles.timerSection}>
        <div className={styles.timerDisplay}>
          <Clock size={24} />
          <span className={`${styles.time} ${timeRemaining < 300 ? styles.warning : ''}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        <div className={styles.timerControls}>
          {!isRunning && timeRemaining > 0 && (
            <button onClick={startTimer} className={styles.startBtn}>
              <Play size={16} />
              Start
            </button>
          )}
          {isRunning && (
            <button onClick={pauseTimer} className={styles.pauseBtn}>
              <Pause size={16} />
              Pause
            </button>
          )}
          <button onClick={resetTimer} className={styles.resetBtn}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Progress</span>
          <span>{completedComponents.size} / {assignment.components?.length || 0} components</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressPercentage}>
          {Math.round(progressPercentage)}%
        </div>
      </div>

      {/* Components List */}
      <div className={styles.componentsSection}>
        <h3>Components to Add</h3>
        <div className={styles.componentsList}>
          {assignment.components?.map((component, index) => {
            const isCompleted = completedComponents.has(component.id || index);
            return (
              <div 
                key={component.id || index}
                className={`${styles.componentItem} ${isCompleted ? styles.completed : styles.pending}`}
                onClick={() => toggleComponent(component.id || index)}
              >
                <div className={styles.componentInfo}>
                  <div className={styles.componentName}>
                    {component.code || component.name}
                  </div>
                  <div className={styles.componentQuantity}>
                    {component.quantity_required || component.quantity} {component.unit}
                  </div>
                </div>
                <div className={styles.componentStatus}>
                  {isCompleted ? (
                    <CheckCircle size={20} className={styles.completedIcon} />
                  ) : (
                    <XCircle size={20} className={styles.pendingIcon} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!isCompleted && (
          <button onClick={handleRequestExtension} className={styles.extensionBtn}>
            Request Time Extension
          </button>
        )}
        {isCompleted && (
          <button onClick={handleComplete} className={styles.completeBtn}>
            Mark as Complete
          </button>
        )}
      </div>
    </div>
  );
};

// Admin Monitoring Dashboard Component
export const AdminMonitoringDashboard = ({ 
  assignments = [], 
  chemicals = [],
  onRefresh,
  onExtendTime,
  onViewDetails,
  loading = false 
}) => {
  const [filter, setFilter] = useState('all'); // all, active, completed, expired
  const [searchTerm, setSearchTerm] = useState('');

  // Filter assignments based on status and search term
  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && assignment.status === 'active') ||
      (filter === 'completed' && assignment.status === 'completed') ||
      (filter === 'expired' && assignment.status === 'expired');
    
    const matchesSearch = 
      (assignment.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.assigned_to_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (assignment) => {
    if (!assignment.created_at || !assignment.time_limit) {
      return { text: 'Unknown', class: 'unknown' };
    }
    
    const now = new Date();
    const endTime = new Date(assignment.created_at);
    endTime.setMinutes(endTime.getMinutes() + (assignment.time_limit || 0));
    
    if (assignment.status === 'completed') {
      return { text: 'Completed', class: 'completed' };
    } else if (now > endTime) {
      return { text: 'Expired', class: 'expired' };
    } else {
      return { text: 'Active', class: 'active' };
    }
  };

  const getTimeRemaining = (assignment) => {
    if (!assignment.created_at || !assignment.time_limit) {
      return '00:00:00';
    }
    
    const now = new Date();
    const endTime = new Date(assignment.created_at);
    endTime.setMinutes(endTime.getMinutes() + (assignment.time_limit || 0));
    
    const remaining = endTime - now;
    if (remaining <= 0) return '00:00:00';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (assignment) => {
    if (!assignment.components || assignment.components.length === 0) return 0;
    
    const completedCount = assignment.components.filter(comp => comp.status === 'COMPLETED').length;
    return Math.round((completedCount / assignment.components.length) * 100);
  };

  const getTeamTypeBadge = (assignment) => {
    if (!assignment.target_quantity || !assignment.target_unit) {
      return 'Unknown';
    }
    
    const quantity = parseFloat(assignment.target_quantity);
    const unit = assignment.target_unit;
    const quantityInGrams = unit === 'kg' ? quantity * 1000 : quantity;
    
    return quantityInGrams < 2000 ? 'Lab Staff' : 'Product Staff';
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Live Assignment Monitoring</h2>
          <p>Track formulation progress in real-time</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className={styles.refreshBtn}
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({assignments.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({assignments.filter(a => a.status === 'active').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({assignments.filter(a => a.status === 'completed').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'expired' ? styles.active : ''}`}
            onClick={() => setFilter('expired')}
          >
            Expired ({assignments.filter(a => a.status === 'expired').length})
          </button>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className={styles.assignmentsGrid}>
        {filteredAssignments.length === 0 ? (
          <div className={styles.noAssignments}>
            <div className={styles.noAssignmentsIcon}>
              <Users size={48} />
            </div>
            <h3>No assignments found</h3>
            <p>
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No assignments have been created yet'
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map(assignment => {
            const status = getStatusBadge(assignment);
            const timeRemaining = getTimeRemaining(assignment);
            const progress = getProgressPercentage(assignment);
            const teamType = getTeamTypeBadge(assignment);
            
            return (
              <div key={assignment.id} className={styles.assignmentCard}>
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.productInfo}>
                    <h3>{assignment.product_name || 'Unknown Product'}</h3>
                    <div className={styles.targetInfo}>
                      Target: {assignment.target_quantity || '0'} {assignment.target_unit || 'g'}
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${styles[status.class]}`}>
                    {status.text}
                  </div>
                </div>

                {/* Assignment Details */}
                <div className={styles.assignmentDetails}>
                  <div className={styles.detailRow}>
                    <Users size={16} />
                    <span className={styles.detailLabel}>Assigned to:</span>
                    <span className={styles.detailValue}>{assignment.assigned_to_name || 'Unknown User'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.teamTypeBadge}>
                      {teamType}
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className={styles.componentsInfo}>
                    {assignment.components?.filter(c => c.status === 'COMPLETED').length || 0} / {assignment.components?.length || 0} components completed
                  </div>
                </div>

                {/* Timer Section */}
                <div className={styles.timerSection}>
                  <div className={styles.timerInfo}>
                    <Clock size={16} />
                    <span className={styles.timerLabel}>Time Remaining:</span>
                    <span className={`${styles.timerValue} ${timeRemaining === '00:00:00' ? styles.expired : ''}`}>
                      {timeRemaining}
                    </span>
                  </div>
                </div>

                {/* Component Status */}
                <div className={styles.componentsStatus}>
                  {assignment.components?.slice(0, 3).map((component, index) => {
                    // Find chemical name from chemicals list
                    const chemical = chemicals.find(c => c.id === component.component_chemical_id);
                    const chemicalName = chemical ? chemical.name : `Chemical ID ${component.component_chemical_id}`;
                    
                    return (
                      <div key={index} className={styles.componentStatus}>
                        <div className={styles.componentName}>
                          {chemicalName}
                        </div>
                        <div className={styles.componentStatusIcon}>
                          {component.status === 'COMPLETED' ? (
                            <CheckCircle size={16} className={styles.completedIcon} />
                          ) : (
                            <XCircle size={16} className={styles.pendingIcon} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {assignment.components?.length > 3 && (
                    <div className={styles.moreComponents}>
                      +{assignment.components.length - 3} more
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <button
                    onClick={() => onViewDetails(assignment.id)}
                    className={styles.viewBtn}
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                  {status.class === 'active' && (
                    <button
                      onClick={() => onExtendTime(assignment.id, 30)}
                      className={styles.extendBtn}
                    >
                      <Clock size={16} />
                      Extend +30min
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
