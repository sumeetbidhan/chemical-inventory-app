import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Save,
  Loader
} from 'lucide-react';
import { API_BASE } from '../config';
import websocketService from '../services/websocketService';
import {
  fetchChemicals,
  fetchChemicalProducts,
  fetchFormulations,
  fetchUsers
} from '../api/newChemicalInventory';
import styles from './ProductAssignmentTab.module.scss';

const ProductAssignmentTab = ({ userInfo, wsConnected = false }) => {
  // State management
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed, expired
  const [searchTerm, setSearchTerm] = useState('');
  
   // Assignment creation state
   const [showAssignmentForm, setShowAssignmentForm] = useState(false);
   const [assignmentFormData, setAssignmentFormData] = useState({
     product_id: '',
     assigned_to_user_id: '',
     quantity_requested: '',
     unit: 'g',
     time_allotted_minutes: 120
   });
   const [submitting, setSubmitting] = useState(false);
   
   // Product search state
   const [productSearchTerm, setProductSearchTerm] = useState('');
   const [filteredProducts, setFilteredProducts] = useState([]);
   const [showProductDropdown, setShowProductDropdown] = useState(false);
   const [selectedProduct, setSelectedProduct] = useState(null);
   const searchContainerRef = useRef(null);
   
   // Data for forms
   const [chemicals, setChemicals] = useState([]);
   const [products, setProducts] = useState([]);
   const [formulations, setFormulations] = useState([]);
   const [users, setUsers] = useState([]);
  

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

   // WebSocket message handler - use the same connection as ChemicalsDashboard
   useEffect(() => {
     // Set up WebSocket message handler
     websocketService.onMessage = handleWebSocketMessage;
     
     return () => {
       // Don't disconnect here as other components might be using it
     };
   }, []);

   // Close dropdown when clicking outside
   useEffect(() => {
     const handleClickOutside = (event) => {
       if (showProductDropdown && searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
         setShowProductDropdown(false);
       }
     };

     document.addEventListener('mousedown', handleClickOutside);
     return () => {
       document.removeEventListener('mousedown', handleClickOutside);
     };
   }, [showProductDropdown]);

  // WebSocket message handler
  const handleWebSocketMessage = (data) => {
    console.log('📨 ProductAssignmentTab WebSocket message received:', data);
    
    switch (data.type) {
      case 'connection_established':
        console.log('✅ ProductAssignmentTab WebSocket connection established');
        // WebSocket status is managed by parent component
        break;
        
      case 'assignment_created':
        console.log('🆕 New assignment created');
        loadAssignments();
        break;
        
      case 'assignment_updated':
        console.log('🔄 Assignment updated');
        loadAssignments();
        break;
        
      case 'assignment_completed':
        console.log('✅ Assignment completed');
        loadAssignments();
        break;
        
      case 'component_completed':
        console.log('🧪 Component completed');
        loadAssignments();
        break;
        
      case 'timer_update':
        console.log('⏰ Timer update received:', data);
        // Update timer for specific assignment
        if (data.assignment_id) {
          setAssignments(prev => prev.map(assignment =>
            assignment.id === data.assignment_id
              ? { ...assignment, time_remaining: data.time_remaining }
              : assignment
          ));
        }
        break;
        
      case 'progress_update':
        console.log('📊 Progress update received:', data);
        // Update progress for specific assignment
        if (data.assignment_id) {
          setAssignments(prev => prev.map(assignment =>
            assignment.id === data.assignment_id
              ? { ...assignment, progress_percentage: data.progress_percentage }
              : assignment
          ));
        }
        break;
        
      default:
        console.log('📨 Unknown message type:', data.type);
    }
  };


  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial data...');
      
      // Load all data in parallel
      const [chemicalsData, productsData, formulationsData, usersData] = await Promise.all([
        fetchChemicals(),
        fetchChemicalProducts(),
        fetchFormulations(),
        fetchUsers()
      ]);
      
       setChemicals(chemicalsData);
       setProducts(productsData);
       setFormulations(formulationsData);
       setUsers(usersData);
       
       console.log('✅ Initial data loaded:', {
         chemicals: chemicalsData.length,
         products: productsData.length,
         formulations: formulationsData.length,
         users: usersData.length
       });
       
       console.log('📦 Products data:', productsData);
       console.log('👥 Users data:', usersData);
      
      // Load assignments after other data is loaded
      await loadAssignments();
      
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load assignments: ${response.status}`);
      }

      const assignmentsData = await response.json();
      console.log('📋 Loaded assignments:', assignmentsData);

      // Load formulation components for each assignment
      const assignmentsWithComponents = await Promise.all(
        assignmentsData.map(async (assignment) => {
          try {
            const componentsResponse = await fetch(`${API_BASE}/assignments/${assignment.id}/formulation-components`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            let components = [];
            if (componentsResponse.ok) {
              components = await componentsResponse.json();
              console.log(`📊 Loaded ${components.length} components for assignment ${assignment.id}`);
            } else {
              console.error(`Failed to load components for assignment ${assignment.id}:`, componentsResponse.status);
            }
            
            return { ...assignment, components };
          } catch (err) {
            console.error(`Error loading components for assignment ${assignment.id}:`, err);
            return assignment;
          }
        })
      );

      setAssignments(assignmentsWithComponents);
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    if (!assignmentFormData.product_id || !assignmentFormData.assigned_to_user_id || !assignmentFormData.quantity_requested) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: parseInt(assignmentFormData.product_id),
          assigned_to_user_id: parseInt(assignmentFormData.assigned_to_user_id),
          quantity_requested: parseFloat(assignmentFormData.quantity_requested),
          unit: assignmentFormData.unit,
          time_allotted_minutes: parseInt(assignmentFormData.time_allotted_minutes)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create assignment: ${response.status}`);
      }

      const newAssignment = await response.json();
      console.log('✅ Assignment created:', newAssignment);

       // Reset form
       setAssignmentFormData({
         product_id: '',
         assigned_to_user_id: '',
         quantity_requested: '',
         unit: 'g',
         time_allotted_minutes: 120
       });
       setSelectedProduct(null);
       setProductSearchTerm('');
       setShowAssignmentForm(false);

      // Reload assignments
      await loadAssignments();

    } catch (err) {
      console.error('Error creating assignment:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

   // Function to determine team type based on quantity
   const getTeamTypeFromQuantity = (quantity, unit) => {
     if (!quantity || isNaN(quantity)) {
       console.log('🔍 getTeamTypeFromQuantity: Invalid quantity', { quantity, unit });
       return null;
     }
     
     const quantityNum = parseFloat(quantity);
     let quantityInKg = quantityNum;
     
     // Convert to kg for comparison
     if (unit === 'g') {
       quantityInKg = quantityNum / 1000;
     } else if (unit === 'kg') {
       quantityInKg = quantityNum;
     }
     
     // 2kg threshold
     const teamType = quantityInKg >= 2 ? 'PRODUCT_TEAM' : 'LAB_STAFF';
     console.log('🔍 getTeamTypeFromQuantity:', { quantity, unit, quantityInKg, teamType });
     return teamType;
   };

   // Function to get filtered users based on team type
   const getFilteredUsers = (teamType) => {
     console.log('🔍 getFilteredUsers called with:', { teamType, totalUsers: users.length });
     
     if (!teamType) {
       const allNonAdminUsers = users.filter(user => user.role_id !== 1);
       console.log('🔍 No team type, returning all non-admin users:', allNonAdminUsers.length);
       return allNonAdminUsers;
     }
     
     // Map team types to role IDs
     const roleIdMap = {
       'PRODUCT_TEAM': 3, // Product Team
       'LAB_STAFF': 2     // Lab Staff
     };
     
     const targetRoleId = roleIdMap[teamType];
     const filteredUsers = users.filter(user => user.role_id === targetRoleId);
     console.log('🔍 Filtered users:', { teamType, targetRoleId, filteredCount: filteredUsers.length });
     return filteredUsers;
   };

   const handleFormChange = (field, value) => {
     console.log('🔍 handleFormChange called:', { field, value });
     
     setAssignmentFormData(prev => {
       const newData = {
         ...prev,
         [field]: value
       };
       
       console.log('🔍 Updated form data:', newData);
       
       // If quantity or unit changes, determine team type and filter users
       if (field === 'quantity_requested' || field === 'unit') {
         const teamType = getTeamTypeFromQuantity(
           field === 'quantity_requested' ? value : newData.quantity_requested,
           field === 'unit' ? value : newData.unit
         );
         
         console.log('🔍 Team type determined:', teamType);
         
         // Clear user selection if current user doesn't match new team type
         if (newData.assigned_to_user_id) {
           const filteredUsers = getFilteredUsers(teamType);
           const currentUserExists = filteredUsers.some(user => user.id === parseInt(newData.assigned_to_user_id));
           console.log('🔍 Current user exists in filtered users:', currentUserExists);
           if (!currentUserExists) {
             console.log('🔍 Clearing user selection due to team mismatch');
             newData.assigned_to_user_id = '';
           }
         }
       }
       
       return newData;
     });
   };

   // Product search functionality
   const handleProductSearch = (searchTerm) => {
     console.log('🔍 Searching for:', searchTerm);
     console.log('📦 Available products:', products.length);
     setProductSearchTerm(searchTerm);
     
     if (searchTerm.length > 0) {
       const filtered = products.filter(product =>
         product.name.toLowerCase().includes(searchTerm.toLowerCase())
       );
       console.log('🔍 Filtered products:', filtered.length);
       setFilteredProducts(filtered);
       setShowProductDropdown(true);
     } else {
       setFilteredProducts([]);
       setShowProductDropdown(false);
     }
   };

   const handleProductSelect = (product) => {
     console.log('🔍 Product selected:', product);
     setSelectedProduct(product);
     setProductSearchTerm(product.name);
     setShowProductDropdown(false);
     setAssignmentFormData(prev => ({
       ...prev,
       product_id: product.id
     }));
   };

  const handleViewDetails = async (assignmentId) => {
    try {
      const token = localStorage.getItem('firebase_token');
      
      // Fetch complete assignment details
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load assignment details: ${response.status}`);
      }

      const assignmentDetails = await response.json();
      console.log('📋 Assignment details:', assignmentDetails);

      // Load formulation components
      const componentsResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/formulation-components`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let components = [];
      if (componentsResponse.ok) {
        components = await componentsResponse.json();
        console.log('🧪 Formulation components:', components);
      }

      setSelectedAssignment({
        ...assignmentDetails.assignment,
        components: components
      });
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error loading assignment details:', err);
      setError(err.message);
    }
  };

  const handleDeleteAssignment = (assignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/${assignmentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete assignment: ${response.status}`);
      }

      // Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      setShowDeleteModal(false);
      setAssignmentToDelete(null);
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (assignment) => {
    switch (assignment.status) {
      case 'COMPLETED':
        return { text: 'Completed', class: 'completed' };
      case 'EXPIRED':
        return { text: 'Expired', class: 'expired' };
      case 'IN_PROGRESS':
        return { text: 'In Progress', class: 'active' };
      case 'ASSIGNED':
        return { text: 'Assigned (OTP Required)', class: 'pending' };
      default:
        return { text: 'Unknown', class: 'unknown' };
    }
  };

  const getTimeRemaining = (assignment) => {
    if (assignment.status === 'ASSIGNED') {
      return 'OTP Required';
    }
    
    if (assignment.time_remaining !== undefined && assignment.time_remaining !== null) {
      const totalMinutes = assignment.time_remaining;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }

    if (assignment.expires_at) {
      const now = new Date();
      const endTime = new Date(assignment.expires_at);
      const remaining = endTime - now;

      if (remaining <= 0) return '00:00:00';

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return '00:00:00';
  };

  const getProgressPercentage = (assignment) => {
    if (!assignment.components || assignment.components.length === 0) {
      return 0;
    }
    
    const completedCount = assignment.components.filter(comp => 
      comp.completed || comp.status === 'COMPLETED'
    ).length;
    
    return Math.round((completedCount / assignment.components.length) * 100);
  };

  const getTeamTypeBadge = (assignment) => {
    switch (assignment.team_type) {
      case 'PRODUCT_TEAM':
        return 'Product Team';
      case 'LAB_STAFF':
        return 'Lab Staff';
      case 'ACCOUNT_TEAM':
        return 'Account Team';
      default:
        return 'Unknown';
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && (assignment.status === 'IN_PROGRESS' || assignment.status === 'ASSIGNED')) ||
      (filter === 'completed' && assignment.status === 'COMPLETED') ||
      (filter === 'expired' && assignment.status === 'EXPIRED');
    
    const matchesSearch = 
      assignment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.assigned_to_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} />
        <p>Loading assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle className={styles.errorIcon} />
        <p>Error: {error}</p>
        <button onClick={loadAssignments} className={styles.retryBtn}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.productAssignmentTab}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Product Assignments</h2>
          <p>Manage and track product formulation assignments</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.wsStatus}>
            <div className={`${styles.statusDot} ${wsConnected ? styles.connected : styles.disconnected}`} />
            <span>{wsConnected ? 'Live Connected' : 'Disconnected'}</span>
          </div>
          <button 
            onClick={() => setShowAssignmentForm(true)} 
            className={styles.assignBtn}
          >
            <Plus size={16} />
            Assign Product
          </button>
          <button onClick={loadAssignments} className={styles.refreshBtn}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
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
        
        <div className={styles.filterButtons}>
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
            Active ({assignments.filter(a => a.status === 'IN_PROGRESS' || a.status === 'ASSIGNED').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({assignments.filter(a => a.status === 'COMPLETED').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'expired' ? styles.active : ''}`}
            onClick={() => setFilter('expired')}
          >
            Expired ({assignments.filter(a => a.status === 'EXPIRED').length})
          </button>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className={styles.assignmentsGrid}>
        {filteredAssignments.length === 0 ? (
          <div className={styles.noAssignments}>
            <AlertCircle className={styles.noAssignmentsIcon} />
            <h3>No assignments found</h3>
            <p>No assignments match your current filter criteria.</p>
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
                    <h3>{assignment.product_name}</h3>
                    <div className={styles.targetInfo}>
                      Target: {assignment.quantity_requested} {assignment.unit}
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
                    <span className={styles.detailValue}>{assignment.assigned_to_name}</span>
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
                    {assignment.components?.filter(c => c.completed || c.status === 'COMPLETED').length || 0} / {assignment.components?.length || 0} components completed
                  </div>
                </div>

                {/* Timer Section */}
                <div className={styles.timerSection}>
                  <div className={styles.timerInfo}>
                    <Clock size={16} />
                    <span className={styles.timerLabel}>Time Remaining:</span>
                    <span className={styles.timerValue}>{timeRemaining}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleViewDetails(assignment.id)}
                    className={styles.viewBtn}
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment)}
                    className={styles.deleteBtn}
                    title="Delete Assignment"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assignment Details Modal */}
      {showDetailsModal && selectedAssignment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>📦 {selectedAssignment.product_name} - Assignment Details</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowDetailsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Assignment Info */}
              <div className={styles.infoSection}>
                <h4>📋 Assignment Information</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Assigned to:</span>
                    <span className={styles.infoValue}>{selectedAssignment.assigned_to_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Target Quantity:</span>
                    <span className={styles.infoValue}>{selectedAssignment.quantity_requested} {selectedAssignment.unit}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={styles.infoValue}>{getStatusBadge(selectedAssignment).text}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Team Type:</span>
                    <span className={styles.infoValue}>{getTeamTypeBadge(selectedAssignment)}</span>
                  </div>
                </div>
              </div>

              {/* Formulation Components */}
              <div className={styles.infoSection}>
                <h4>🧪 Formulation Components</h4>
                <div className={styles.componentsList}>
                  {selectedAssignment.components && selectedAssignment.components.length > 0 ? (
                    selectedAssignment.components.map((component, index) => {
                      const isCompleted = component.completed || component.status === 'COMPLETED';
                      const chemicalName = component.chemical_name || component.component_name || `Chemical ID ${component.component_chemical_id}`;
                      const quantity = component.scaled_quantity || component.quantity_required || 0;
                      const unit = component.unit || 'g';
                      
                      return (
                        <div key={component.id || index} className={styles.componentItem}>
                          <div className={styles.componentInfo}>
                            <div className={styles.componentName}>
                              {chemicalName}
                            </div>
                            <div className={styles.componentQuantity}>
                              {quantity.toFixed(2)} {unit}
                            </div>
                            <div className={styles.componentScaled}>
                              Scaled Quantity: {quantity.toFixed(2)} {unit}
                            </div>
                          </div>
                          <div className={`${styles.componentStatus} ${isCompleted ? styles.completed : styles.pending}`}>
                            {isCompleted ? (
                              <CheckCircle size={20} className={styles.completedIcon} />
                            ) : (
                              <XCircle size={20} className={styles.pendingIcon} />
                            )}
                            <span>{isCompleted ? 'Added' : 'Pending'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.noComponents}>
                      <p>No formulation components found for this product.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && assignmentToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <div className={styles.deleteModalHeader}>
              <AlertCircle className={styles.warningIcon} />
              <h3>Delete Assignment</h3>
            </div>
            <div className={styles.deleteModalBody}>
              <p>Are you sure you want to delete this assignment?</p>
              <p><strong>{assignmentToDelete.product_name}</strong> - {assignmentToDelete.assigned_to_name}</p>
              <p className={styles.warningText}>This action cannot be undone.</p>
            </div>
            <div className={styles.deleteModalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmDeleteBtn}
                onClick={confirmDeleteAssignment}
              >
                <Trash2 size={16} />
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.assignmentFormModal}>
            <div className={styles.modalHeader}>
              <h3>Assign Product</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowAssignmentForm(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAssignment} className={styles.assignmentForm}>
              <div className={styles.formGrid}>
                 <div className={styles.formGroup}>
                   <label className={styles.formLabel}>
                     Product <span className={styles.required}>*</span>
                   </label>
                   <div ref={searchContainerRef} className={styles.searchContainer}>
                     <input
                       type="text"
                       value={productSearchTerm}
                       onChange={(e) => handleProductSearch(e.target.value)}
                       onFocus={() => setShowProductDropdown(true)}
                       className={styles.formInput}
                       placeholder={selectedProduct ? `Selected: ${selectedProduct.name}` : "Search for a product..."}
                       required
                     />
                     {selectedProduct && (
                       <button
                         type="button"
                         onClick={() => {
                           setSelectedProduct(null);
                           setProductSearchTerm('');
                           setAssignmentFormData(prev => ({ ...prev, product_id: '' }));
                         }}
                         className={styles.clearBtn}
                         title="Clear selection"
                       >
                         <X size={16} />
                       </button>
                     )}
                     {showProductDropdown && (
                       <div className={styles.searchDropdown}>
                         {filteredProducts.length > 0 ? (
                           filteredProducts.map(product => (
                             <div
                               key={product.id}
                               className={styles.searchOption}
                               onClick={() => handleProductSelect(product)}
                             >
                               <div className={styles.productName}>{product.name}</div>
                               <div className={styles.productDetails}>
                                 {product.base_composition_qty} {product.unit}
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className={styles.noResults}>
                             No products found
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Quantity <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={assignmentFormData.quantity_requested}
                    onChange={(e) => handleFormChange('quantity_requested', e.target.value)}
                    className={styles.formInput}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unit</label>
                  <select
                    value={assignmentFormData.unit}
                    onChange={(e) => handleFormChange('unit', e.target.value)}
                    className={styles.formSelect}
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Assign to User <span className={styles.required}>*</span>
                  </label>
                  
                  {/* Team Assignment Indicator */}
                  {assignmentFormData.quantity_requested && assignmentFormData.unit && (
                    <div className={styles.teamIndicator}>
                      <div className={styles.teamIndicatorContent}>
                        <span className={styles.teamLabel}>Auto-assigned team:</span>
                        <span className={`${styles.teamBadge} ${
                          getTeamTypeFromQuantity(assignmentFormData.quantity_requested, assignmentFormData.unit) === 'PRODUCT_TEAM' 
                            ? styles.productTeam 
                            : styles.labStaff
                        }`}>
                          {getTeamTypeFromQuantity(assignmentFormData.quantity_requested, assignmentFormData.unit) === 'PRODUCT_TEAM' 
                            ? '🏭 Product Team' 
                            : '🧪 Lab Staff'
                          }
                        </span>
                        <span className={styles.teamThreshold}>
                          ({assignmentFormData.quantity_requested} {assignmentFormData.unit} {getTeamTypeFromQuantity(assignmentFormData.quantity_requested, assignmentFormData.unit) === 'PRODUCT_TEAM' ? '≥ 2kg' : '< 2kg'})
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <select
                    value={assignmentFormData.assigned_to_user_id}
                    onChange={(e) => handleFormChange('assigned_to_user_id', e.target.value)}
                    className={styles.formSelect}
                    required
                  >
                    <option value="">Select a user</option>
                    {(() => {
                      const teamType = getTeamTypeFromQuantity(assignmentFormData.quantity_requested, assignmentFormData.unit);
                      const filteredUsers = getFilteredUsers(teamType);
                      
                      const getRoleName = (roleId) => {
                        switch (roleId) {
                          case 1: return 'Admin';
                          case 2: return 'Lab Staff';
                          case 3: return 'Product Team';
                          case 4: return 'Account Team';
                          case 5: return 'All Users';
                          default: return 'Unknown';
                        }
                      };
                      
                      console.log('👥 Filtered users for team:', {
                        teamType,
                        totalUsers: users.length,
                        filteredUsers: filteredUsers.length,
                        users: filteredUsers.map(u => ({ 
                          id: u.id, 
                          name: `${u.first_name} ${u.last_name}`, 
                          role_id: u.role_id,
                          role_name: getRoleName(u.role_id)
                        }))
                      });
                      
                      return filteredUsers.map(user => {
                        return (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} - {getRoleName(user.role_id)} ({user.email})
                          </option>
                        );
                      });
                    })()}
                  </select>
                  
                  {assignmentFormData.quantity_requested && assignmentFormData.unit && (() => {
                    const teamType = getTeamTypeFromQuantity(assignmentFormData.quantity_requested, assignmentFormData.unit);
                    const filteredUsers = getFilteredUsers(teamType);
                    
                    if (filteredUsers.length === 0) {
                      return (
                        <div className={styles.noUsersWarning}>
                          <AlertCircle size={16} />
                          No {teamType === 'PRODUCT_TEAM' ? 'Product Team' : 'Lab Staff'} users available for assignment.
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Time Allotted (minutes)</label>
                  <input
                    type="number"
                    min="30"
                    max="480"
                    value={assignmentFormData.time_allotted_minutes}
                    onChange={(e) => handleFormChange('time_allotted_minutes', e.target.value)}
                    className={styles.formInput}
                    placeholder="120"
                  />
                </div>
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowAssignmentForm(false)}
                  className={styles.cancelBtn}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader className={styles.spinner} size={16} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Create Assignment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAssignmentTab;
