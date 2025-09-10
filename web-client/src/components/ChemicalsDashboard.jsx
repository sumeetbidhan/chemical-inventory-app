import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';
import { AssignmentFormModal, AdminMonitoringDashboard, FormulationProgress } from './FormulationsManagement/AssignmentSystem';
import ProductAssignmentTab from './ProductAssignmentTab';
import {
  FlaskConical,
  FileSpreadsheet,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import {
  fetchChemicals,
  createChemical,
  updateChemical,
  deleteChemical,
  fetchChemicalProducts,
  createChemicalProduct,
  fetchFormulations,
  createFormulation,
  updateFormulation,
  deleteFormulation,
  fetchAssignments,
  createAssignment,
  fetchUsers,
  uploadExcelFile
} from '../api/newChemicalInventory';
import { API_BASE } from '../config';
import styles from './ChemicalsDashboard.module.scss';

export default function ChemicalsDashboard() {
  const { user, userInfo } = useAuth();
  
  // Core state
  const [chemicals, setChemicals] = useState([]);
  const [chemicalProducts, setChemicalProducts] = useState([]);
  const [formulations, setFormulations] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Pagination state
  const [chemicalsCurrentPage, setChemicalsCurrentPage] = useState(1);
  const [chemicalsPerPage] = useState(10);
  const [formulationsCurrentPage, setFormulationsCurrentPage] = useState(1);
  const [formulationsPerPage] = useState(10);
  
  // UI state
  const [activeTab, setActiveTab] = useState('chemicals');
  const [loading, setLoading] = useState(true);
  
  
  // Form states
  const [showChemicalForm, setShowChemicalForm] = useState(false);
  const [showFormulationForm, setShowFormulationForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  
  // Assignment system state
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  
  // Extension request state
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedExtensionRequest, setSelectedExtensionRequest] = useState(null);
  const [extensionLoading, setExtensionLoading] = useState(false);
  // Excel edit state
  const [excelEditData, setExcelEditData] = useState(null);
  const [excelValidationMsg, setExcelValidationMsg] = useState('');
  
  // Edit states
  const [editingChemical, setEditingChemical] = useState(null);
  const [editingFormulation, setEditingFormulation] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  // Formulation details modal state
  const [showFormulationDetails, setShowFormulationDetails] = useState(false);
  const [selectedFormulationProduct, setSelectedFormulationProduct] = useState(null);
  const [scaledQuantity, setScaledQuantity] = useState(0);
  const [editingFormulationProduct, setEditingFormulationProduct] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [savingFormulation, setSavingFormulation] = useState(false);
  
  // Removed unnecessary search and filters
  
  // Excel upload state
  const [excelData, setExcelData] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Assignment tracking state
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [assignmentProgress, setAssignmentProgress] = useState({});
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Screen size state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Search and filter state
  const [chemicalSearchTerm, setChemicalSearchTerm] = useState('');
  const [chemicalFilterType, setChemicalFilterType] = useState('all'); // all, raw, manufactured
  const [formulationSearchTerm, setFormulationSearchTerm] = useState('');
  
  // Load initial data
  useEffect(() => {
    if (user && userInfo) {
      loadInitialData(); 
      loadAssignments(); // Load existing assignments
      loadExtensionRequests(); // Load extension requests
    }
  }, [user, userInfo]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
              // WebSocket connection
            useEffect(() => {
              if (user && userInfo && userInfo.role_id === 1) { // Admin only
                const connectWebSocket = async () => {
                  try {
                    // Get fresh token
                    const token = await user.getIdToken(true);
                    localStorage.setItem('firebase_token', token);

                    // Connect to WebSocket with fresh token
                    await websocketService.connect(
                      'admin', // team type
                      userInfo.id.toString(), // user ID
                      token,
                      // onMessage
                      (data) => {
                        console.log('📨 Admin WebSocket message received:', data);
                        handleWebSocketMessage(data);
                      },
                      // onError
                      (error) => {
                        console.error('❌ Admin WebSocket error:', error);
                        setWsConnected(false);
                      },
                      // onClose
                      (event) => {
                        console.log('🔌 Admin WebSocket closed:', event.code, event.reason);
                        setWsConnected(false);
                      }
                    );

                    // Check connection status
                    const checkConnection = () => {
                      const status = websocketService.getConnectionStatus('admin', userInfo.id.toString());
                      setWsConnected(status === 'connected');
                    };

                    // Check connection status periodically
                    const interval = setInterval(checkConnection, 1000);
                    checkConnection(); // Initial check

                    return () => {
                      clearInterval(interval);
                      websocketService.disconnect('admin', userInfo.id.toString());
                    };
                  } catch (error) {
                    console.error('❌ Failed to connect WebSocket:', error);
                  }
                };

                // Call the async function
                connectWebSocket().catch(error => {
                  console.error('❌ Failed to connect WebSocket:', error);
                });
              }
            }, [user, userInfo]);
  
  // Filter chemicals based on search term and type
  const getFilteredChemicals = () => {
    if (!chemicals || !Array.isArray(chemicals)) return [];
    let filtered = chemicals;
    
    // Filter by search term
    if (chemicalSearchTerm) {
      filtered = filtered.filter(chemical => 
        chemical.name && chemical.name.toLowerCase().includes(chemicalSearchTerm.toLowerCase())
      );
    }
    
    // Filter by type
    if (chemicalFilterType !== 'all') {
      filtered = filtered.filter(chemical => {
        if (chemicalFilterType === 'raw') return !chemical.is_manufactured;
        if (chemicalFilterType === 'manufactured') return chemical.is_manufactured;
        if (chemicalFilterType === 'below_threshold') return chemical.available_qty <= chemical.threshold_qty;
        return true;
      });
    }
    
    // Sort by database index (id) in ascending order
    filtered = filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    
    return filtered;
  };

  // Get paginated chemicals
  const getPaginatedChemicals = () => {
    const filtered = getFilteredChemicals();
    const startIndex = (chemicalsCurrentPage - 1) * chemicalsPerPage;
    const endIndex = startIndex + chemicalsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for chemicals
  const getTotalChemicalPages = () => {
    const filtered = getFilteredChemicals();
    return Math.ceil(filtered.length / chemicalsPerPage);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setChemicalsCurrentPage(1);
  }, [chemicalSearchTerm, chemicalFilterType]);

  // Get filtered formulations (products) for pagination
  const getFilteredFormulations = () => {
    let uniqueProducts = getUniqueFormulationProducts();
    
    if (formulationSearchTerm) {
      uniqueProducts = uniqueProducts.filter(product => 
        product.name && product.name.toLowerCase().startsWith(formulationSearchTerm.toLowerCase())
      );
    }
    
    // Sort by database index (id) in ascending order
    uniqueProducts = uniqueProducts.sort((a, b) => (a.id || 0) - (b.id || 0));
    
    return uniqueProducts;
  };

  // Get paginated formulations
  const getPaginatedFormulations = () => {
    const filtered = getFilteredFormulations();
    const startIndex = (formulationsCurrentPage - 1) * formulationsPerPage;
    const endIndex = startIndex + formulationsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for formulations
  const getTotalFormulationPages = () => {
    const filtered = getFilteredFormulations();
    return Math.ceil(filtered.length / formulationsPerPage);
  };

  // Reset formulations pagination when search changes
  useEffect(() => {
    setFormulationsCurrentPage(1);
  }, [formulationSearchTerm]);

  const loadAssignments = async () => {
    try {
      console.log('🔍 Loading assignments...');
      const token = localStorage.getItem('firebase_token');
      console.log('🔑 Token present:', token ? 'Yes' : 'No');
      
      const response = await fetch('http://localhost:8000/assignments/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Assignments API response status:', response.status);
      console.log('📡 Assignments API response ok:', response.ok);

      if (response.ok) {
        const assignmentsData = await response.json();
        console.log('📋 Raw assignments data:', assignmentsData);
        console.log('📊 Assignments data type:', typeof assignmentsData);
        console.log('📊 Assignments is array:', Array.isArray(assignmentsData));
        console.log('🔢 Assignments length:', assignmentsData?.length);
        
        if (assignmentsData && assignmentsData.length > 0) {
          console.log('🔍 First assignment details:', assignmentsData[0]);
          console.log('🔍 Assignment status:', assignmentsData[0].status);
          console.log('🔍 Assignment progress:', assignmentsData[0].progress_percentage);
          console.log('🔍 Assignment time remaining:', assignmentsData[0].time_remaining);
          console.log('🔍 Assignment product name:', assignmentsData[0].product_name);
          console.log('🔍 Assignment assigned to:', assignmentsData[0].assigned_to_name);
        }
        
        // Transform assignments to match frontend format
        const transformedAssignments = assignmentsData.map(assignment => {
          console.log('🔄 Transforming assignment:', assignment.id, 'Status:', assignment.status);
          return {
            id: assignment.id,
            product_name: assignment.product_name,
            assigned_to_name: assignment.assigned_to_name,
            target_quantity: assignment.quantity_requested,
            target_unit: assignment.unit,
            status: assignment.status,
            progress_percentage: assignment.progress_percentage || 0,
            created_at: assignment.created_at,
            timeLimit: assignment.time_remaining || 60,
            components: [], // Will be loaded when viewing details
            is_expired: assignment.is_expired || false,
            time_remaining: assignment.time_remaining || 0,
            team_type: assignment.team_type || 'UNKNOWN'
          };
        });
        
        // Load formulation components for each assignment to calculate progress
        const assignmentsWithComponents = await Promise.all(
          transformedAssignments.map(async (assignment) => {
            try {
              const componentsResponse = await fetch(`${API_BASE}/assignments/${assignment.id}/formulation-components`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
                }
              });
              
              if (componentsResponse.ok) {
                const components = await componentsResponse.json();
                console.log(`📊 Loaded ${components.length} components for assignment ${assignment.id}`);
                return { ...assignment, components };
              } else {
                console.error(`Failed to load components for assignment ${assignment.id}:`, componentsResponse.status);
                return assignment;
              }
            } catch (err) {
              console.error(`Error loading components for assignment ${assignment.id}:`, err);
              return assignment;
            }
          })
        );
        
        console.log('✅ Transformed assignments with components:', assignmentsWithComponents);
        setAssignments(assignmentsWithComponents);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load assignments:', response.status, errorText);
        
        if (response.status === 401) {
          console.error('Authentication failed when loading assignments');
        }
      }
    } catch (err) {
      console.error('❌ Error loading assignments:', err);
    }
  };
  
  // Load formulation components for an assignment
  const loadFormulationComponents = async (assignmentId) => {
    try {
      console.log('🧪 Loading formulation components for assignment:', assignmentId);
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/formulation-components`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const components = await response.json();
        console.log('🧪 Formulation components loaded:', components);
        return components;
      } else {
        console.error('❌ Failed to load formulation components:', response.status);
        return [];
      }
    } catch (err) {
      console.error('❌ Error loading formulation components:', err);
      return [];
    }
  };

  // Load extension requests
  const loadExtensionRequests = async () => {
    try {
      setExtensionLoading(true);
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/extension-requests/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch extension requests');
      }
      
      const data = await response.json();
      setExtensionRequests(data);
    } catch (err) {
      console.error('Error loading extension requests:', err);
    } finally {
      setExtensionLoading(false);
    }
  };
  
  // Handle extension request approval
  const handleApproveExtension = async (requestId, newMinutes) => {
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_minutes: newMinutes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to approve extension');
      }
      
      // Refresh data
      loadAssignments();
      loadExtensionRequests();
      setShowExtensionModal(false);
      setSelectedExtensionRequest(null);
      
    } catch (err) {
      console.error('Error approving extension:', err);
      alert(`Error: ${err.message}`);
    }
  };
  
  // Handle extension request rejection
  const handleRejectExtension = async (requestId, reason) => {
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/extension-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to reject extension');
      }
      
      // Refresh data
      loadAssignments();
      loadExtensionRequests();
      setShowExtensionModal(false);
      setSelectedExtensionRequest(null);
      
    } catch (err) {
      console.error('Error rejecting extension:', err);
      alert(`Error: ${err.message}`);
    }
  };
  
  // Handle delete assignment
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete assignment');
      }
      
      // Refresh data
      loadAssignments();
      loadExtensionRequests();
      
    } catch (err) {
      console.error('Error deleting assignment:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('Loading initial data...');
      
      // Load chemicals first (this is working)
      try {
        const chemicalsData = await fetchChemicals();
        console.log('Chemicals loaded successfully:', chemicalsData);
        setChemicals(chemicalsData);
      } catch (err) {
        console.error('Error loading chemicals:', err);
        setChemicals([]);
      }
      
      // Load other data separately to avoid blocking chemicals
      try {
        console.log('🔍 Fetching chemical products...');
        const productsData = await fetchChemicalProducts();
        console.log('📦 Chemical products API response:', productsData);
        console.log('📊 Products data type:', typeof productsData);
        console.log('📋 Products is array:', Array.isArray(productsData));
        console.log('🔢 Products length:', productsData?.length || 'undefined');
        
        if (productsData && Array.isArray(productsData)) {
          setChemicalProducts(productsData);
          console.log('✅ Chemical products set successfully:', productsData.length);
        } else {
          console.error('❌ Invalid products data format:', productsData);
          setChemicalProducts([]);
        }
      } catch (err) {
        console.error('❌ Error loading chemical products:', err);
        console.error('🔍 Error details:', err.message);
        setChemicalProducts([]);
      }
      
      try {
        const formulationsData = await fetchFormulations();
        console.log('Formulations loaded successfully:', formulationsData);
        setFormulations(formulationsData);
      } catch (err) {
        console.error('Error loading formulations:', err);
        setFormulations([]);
      }
      
      try {
        const usersData = await fetchUsers();
        console.log('Users loaded successfully:', usersData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error loading users:', err);
        setUsers([]);
      }
      
    } catch (err) {
      console.error('Error in loadInitialData:', err);
    } finally {
      setLoading(false);
    }
  };
  

  
  const handleWebSocketMessage = (data) => {
    console.log('📨 Admin WebSocket message received:', data);
    console.log('📨 Message type:', data.type);
    console.log('📨 Message data:', JSON.stringify(data, null, 2));
    
    switch (data.type) {
      case 'connection_established':
        console.log('✅ Admin WebSocket connection established');
        setWsConnected(true);
        break;
        
      case 'connection_info':
        console.log('ℹ️ Admin connection info:', data.message);
        setWsConnected(true);
        break;
        
      case 'pong':
        console.log('🏓 Admin pong received');
        break;
        
      case 'assignment_created':
        console.log('🆕 New assignment created');
        console.log('🆕 Assignment data:', data);
        loadAssignments(); // Refresh assignments
        addNotification({
          type: 'info',
          title: 'New Assignment',
          message: 'A new assignment has been created',
          timestamp: new Date()
        });
        break;
        
      case 'assignment_updated':
        console.log('🔄 Assignment updated');
        console.log('🔄 Assignment data:', data);
        loadAssignments(); // Refresh assignments
        break;
        
      case 'assignment_completed':
        console.log('✅ Assignment completed by', data.updated_by);
        console.log('✅ Assignment data:', data);
        loadAssignments(); // Refresh assignments
        addNotification({
          type: 'success',
          title: 'Assignment Completed',
          message: `Assignment completed by ${data.updated_by}`,
          timestamp: new Date()
        });
        break;
        
      case 'timer_update':
        console.log('⏰ Timer update received:', data);
        console.log('⏰ Assignment ID:', data.assignment_id);
        console.log('⏰ Time remaining:', data.time_remaining);
        // Update timer for specific assignment
        if (data.assignment_id) {
          setAssignments(prev => {
            console.log('⏰ Updating timer for assignment:', data.assignment_id);
            const updated = prev.map(assignment => 
              assignment.id === data.assignment_id 
                ? { ...assignment, time_remaining: data.time_remaining }
                : assignment
            );
            console.log('⏰ Updated assignments:', updated);
            return updated;
          });
        }
        break;
        
      case 'progress_update':
        console.log('📊 Progress update received:', data);
        console.log('📊 Assignment ID:', data.assignment_id);
        console.log('📊 Progress percentage:', data.progress_percentage);
        // Update progress for specific assignment
        if (data.assignment_id) {
          setAssignments(prev => {
            console.log('📊 Updating progress for assignment:', data.assignment_id);
            const updated = prev.map(assignment => 
              assignment.id === data.assignment_id 
                ? { ...assignment, progress_percentage: data.progress_percentage }
                : assignment
            );
            console.log('📊 Updated assignments:', updated);
            return updated;
          });
        }
        break;
        
      case 'component_completed':
        console.log('🧪 Component completed by', data.completed_by);
        addNotification({
          type: 'success',
          title: 'Component Completed',
          message: `Component completed by ${data.completed_by}`,
          timestamp: new Date()
        });
        break;
        
      case 'help_requested':
        console.log('🆘 Help requested by', data.user_id, ':', data.message);
        addNotification({
          type: 'warning',
          title: 'Help Requested',
          message: `Help requested: ${data.message}`,
          timestamp: new Date()
        });
        break;
        
      case 'otp_expired':
        console.log('⏰ OTP expired');
        addNotification({
          type: 'error',
          title: 'OTP Expired',
          message: 'An OTP has expired',
          timestamp: new Date()
        });
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', data.message);
        addNotification({
          type: 'error',
          title: 'WebSocket Error',
          message: data.message,
          timestamp: new Date()
        });
        break;
        
      // Legacy message types for backward compatibility
      case 'COMPONENT_COMPLETED':
        handleComponentCompleted(data);
        break;
      case 'TIMER_EXPIRED':
        handleTimerExpired(data);
        break;
      case 'OTP_EXTENSION_REQUESTED':
        handleOtpExtensionRequested(data);
        break;
      case 'ASSIGNMENT_COMPLETED':
        handleAssignmentCompleted(data);
        break;
      case 'PROGRESS_UPDATE':
        handleProgressUpdate(data);
        break;
        
      default:
        console.log('❓ Unknown WebSocket message type:', data.type);
    }
  };
  
  const handleComponentCompleted = (data) => {
    addNotification({
      type: 'success',
      title: 'Component Completed',
      message: `${data.component_code} completed by ${data.team_member}`,
      timestamp: new Date()
    });
    
    // Update assignment progress
    setAssignmentProgress(prev => ({
      ...prev,
      [data.assignment_id]: {
        ...prev[data.assignment_id],
        [data.component_code]: { completed: true, quantity: data.quantity_added }
      }
    }));
  };
  
  const handleTimerExpired = (data) => {
    addNotification({
      type: 'warning',
      title: 'Timer Expired',
      message: `Assignment for ${data.product_name} has expired`,
      timestamp: new Date()
    });
  };
  
  const handleOtpExtensionRequested = (data) => {
    addNotification({
      type: 'info',
      title: 'OTP Extension Requested',
      message: `${data.user_name} requested OTP extension for ${data.product_name}`,
      timestamp: new Date()
    });
  };
  
  const handleAssignmentCompleted = (data) => {
    addNotification({
      type: 'success',
      title: 'Assignment Completed',
      message: `${data.product_name} completed by ${data.team_member}`,
      timestamp: new Date()
    });
    
    // Refresh assignments
    loadInitialData();
  };
  
  const handleProgressUpdate = (data) => {
    setAssignmentProgress(prev => ({
      ...prev,
      [data.assignment_id]: {
        ...prev[data.assignment_id],
        ...data.progress
      }
    }));
  };
  
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
  };
  
  // Chemical management functions
  const handleCreateChemical = async (chemicalData) => {
    try {
      const newChemical = await createChemical(chemicalData);
      console.log('Chemical created successfully:', newChemical);
      
      setChemicals(prev => {
        const updated = [...prev, newChemical];
        console.log('Updated chemicals state:', updated);
        return updated;
      });
      
      setShowChemicalForm(false);
      addNotification({
        type: 'success',
        title: 'Chemical Created',
        message: `Chemical ${newChemical.name} created successfully`,
        timestamp: new Date()
      });
          } catch (err) {
        console.error('Error creating chemical:', err);
      }
  };
  
  const handleUpdateChemical = async (id, chemicalData) => {
    try {
      const updatedChemical = await updateChemical(id, chemicalData);
      setChemicals(prev => prev.map(c => c.id === id ? updatedChemical : c));
      setEditingChemical(null);
      addNotification({
        type: 'success',
        title: 'Chemical Updated',
        message: `Chemical ${updatedChemical.name} updated successfully`,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error updating chemical:', err);
    }
  };
  
  const handleDeleteChemical = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chemical?')) return;
    
    try {
      await deleteChemical(id);
      setChemicals(prev => prev.filter(c => c.id !== id));
      addNotification({
        type: 'success',
        title: 'Chemical Deleted',
        message: 'Chemical deleted successfully',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error deleting chemical:', err);
    }
  };
  
  // Formulation management functions
  const handleCreateFormulation = async (formulationData) => {
    try {
      console.log('🚀 Starting formulation creation process...');
      console.log('📦 Formulation data received:', formulationData);
      
      // Extract product and components data
      const { product, components } = formulationData;
      console.log('📦 Product data:', product);
      console.log('🧪 Components data:', components);
      console.log('🔍 Current chemicals count:', chemicals.length);
      
      // Step 1: Check if product chemical already exists
      console.log('🔍 Step 1: Checking for existing product chemical...');
      let productChemical = chemicals.find(c => c.name === product.name);
      
      if (!productChemical) {
        console.log('🆕 Product chemical not found, creating new one...');
        console.log('📊 Creating chemical with data:', {
          name: product.name,
          unit: product.unit,
          available_qty: 0.0,
          threshold_qty: 0.0,
          is_manufactured: true
        });
        
        // Create the manufactured chemical (product) if it doesn't exist
        productChemical = await createChemical({
          name: product.name,
          unit: product.unit,
          available_qty: 0.0, // No stock initially
          threshold_qty: 0.0, // No threshold initially
          is_manufactured: true // This is a manufactured chemical
        });
        
        console.log('✅ Product chemical created successfully:', productChemical);
        
        // Refresh chemicals list
        const chemicalsData = await fetchChemicals();
        setChemicals(chemicalsData);
        console.log('🔄 Chemicals list refreshed, new count:', chemicalsData.length);
      } else {
        console.log('✅ Using existing product chemical:', productChemical);
      }
      
      // Step 2: Check if chemical product already exists
      console.log('🔍 Step 2: Checking for existing chemical product...');
      let chemicalProduct = chemicalProducts.find(p => p.name === product.name);
      
      if (!chemicalProduct) {
        console.log('🆕 Chemical product not found, creating new one...');
        console.log('📊 Chemical product data:', {
          chemical_id: productChemical.id,
          name: product.name,
          base_composition_qty: product.base_composition_qty,
          unit: product.unit,
          note: `Created from formulation: ${product.name}`,
          created_by: userInfo?.id || 1
        });
        
        chemicalProduct = await createChemicalProduct({
          chemical_id: productChemical.id,
          name: product.name,
          base_composition_qty: product.base_composition_qty,
          unit: product.unit,
          note: `Created from formulation: ${product.name}`,
          created_by: userInfo?.id || 1
        });
        
        console.log('✅ Chemical product created successfully:', chemicalProduct);
      } else {
        console.log('✅ Using existing chemical product:', chemicalProduct);
      }
      
      // Step 3: Create all component chemicals and formulations
      const createdFormulations = [];
      
      for (const component of components) {
        console.log(`\n🧪 Processing component: ${component.name}`);
        
        // Check if chemical already exists
        let componentChemical = chemicals.find(c => c.name === component.name);
        
        if (!componentChemical) {
          console.log(`🆕 Component chemical "${component.name}" not found, creating new one...`);
          console.log('📊 Component chemical data:', {
            name: component.name,
            unit: component.unit,
            available_qty: 0.0,
            threshold_qty: 0.0,
            is_manufactured: false
          });
          
          // Create new chemical if it doesn't exist
          componentChemical = await createChemical({
            name: component.name,
            unit: component.unit,
            available_qty: 0.0, // Default: no stock
            threshold_qty: 0.0, // Default: no threshold
            is_manufactured: false // Default: raw chemical
          });
          
          console.log(`✅ Component chemical "${component.name}" created successfully:`, componentChemical);
          
          // Refresh chemicals list
          const chemicalsData = await fetchChemicals();
          setChemicals(chemicalsData);
          console.log('🔄 Chemicals list refreshed after component creation');
          
          addNotification({
            type: 'success',
            title: 'Chemical Created',
            message: `New chemical "${component.name}" created successfully`,
            timestamp: new Date()
          });
        } else {
          console.log(`✅ Using existing component chemical "${component.name}":`, componentChemical);
        }
        
        // Create formulation linking product to component
        console.log('🔄 Step 3: Creating formulation for component:', component.name);
        console.log('📊 Formulation data being sent:', {
          product_id: chemicalProduct.id,
          component_chemical_id: componentChemical.id,
          quantity_required: component.quantity,
          unit: component.unit
        });
        
        try {
          console.log('📡 Calling createFormulation API...');
          const formulation = await createFormulation({
            product_id: chemicalProduct.id,
            component_chemical_id: componentChemical.id,
            quantity_required: component.quantity,
            unit: component.unit
          });
          
          console.log('✅ Formulation created successfully:', formulation);
          createdFormulations.push(formulation);
        } catch (formulationError) {
          console.error('❌ Error creating formulation for component:', component.name);
          console.error('🔍 Formulation error details:', formulationError);
          console.error('📊 Failed data:', {
            product_id: chemicalProduct.id,
            component_chemical_id: componentChemical.id,
            quantity_required: component.quantity,
            unit: component.unit
          });
          throw formulationError; // Re-throw to be caught by outer try-catch
        }
      }
      
      console.log('\n🔄 Refreshing data after all formulations created...');
      
      // Refresh data
      const [productsData, formulationsData] = await Promise.all([
        fetchChemicalProducts(),
        fetchFormulations()
      ]);
      
      console.log('✅ Data refresh completed:');
      console.log('📦 Products count:', productsData.length);
      console.log('🧪 Formulations count:', formulationsData.length);
      
      setChemicalProducts(productsData);
      setFormulations(formulationsData);
      
      // Close modal and show success
      setShowFormulationForm(false);
      console.log('🎉 Formulation creation process completed successfully!');
      addNotification({
        type: 'success',
        title: 'Formulation Created',
        message: `Formulation "${product.name}" created successfully with ${components.length} components`,
        timestamp: new Date()
      });
      
    } catch (err) {
      console.error('❌ CRITICAL ERROR in formulation creation process:');
      console.error('🔍 Error details:', err);
      console.error('📊 Error message:', err.message);
      console.error('📋 Error stack:', err.stack);
      console.error('🚨 Formulation creation failed completely');
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to create formulation: ${err.message}`,
        timestamp: new Date()
      });
    }
  };
  
  const handleUpdateFormulation = async (id, formulationData) => {
    try {
      const updatedFormulation = await updateFormulation(id, formulationData);
      setFormulations(prev => prev.map(f => f.id === id ? updatedFormulation : f));
      setEditingFormulation(null);
      addNotification({
        type: 'success',
        title: 'Formulation Updated',
        message: `Formulation updated successfully`,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error updating formulation:', err);
    }
  };
  
  const handleDeleteFormulation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this formulation?')) return;
    
    try {
      await deleteFormulation(id);
      setFormulations(prev => prev.filter(f => f.id !== id));
      addNotification({
        type: 'success',
        title: 'Formulation Deleted',
        message: 'Formulation deleted successfully',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error deleting formulation:', err);
    }
  };
  
  const handleExcelUpload = async (file) => {
    try {
      setUploading(true);
      console.log('[ChemicalsDashboard] handleExcelUpload start');
      const result = await uploadExcelFile(file);
      console.log('[ChemicalsDashboard] uploadExcelFile result:', result);
      setExcelPreview(result.parsed_data);
      setExcelData(result.parsed_data);
      // Initialize editable copy
      setExcelEditData({
        product_name: result.parsed_data.product_name || '',
        base_composition_qty: result.parsed_data.base_composition_qty || 0,
        unit: result.parsed_data.unit || 'g',
        components: (result.parsed_data.components || []).map(c => ({
          code: c.code || '',
          quantity: c.quantity || 0,
          unit: c.unit || (result.parsed_data.unit || 'g')
        }))
      });
      // Reset validation
      setExcelValidationMsg('');
      setShowExcelUpload(false);
      addNotification({
        type: 'success',
        title: 'Excel Uploaded',
        message: 'Excel file parsed successfully. Please review and approve.',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('[ChemicalsDashboard] Error uploading Excel:', err);
    } finally {
      console.log('[ChemicalsDashboard] handleExcelUpload end (uploading=false)');
      setUploading(false);
    }
  };

  // Excel edit helpers
  const getExcelComponentsTotal = () => {
    if (!excelEditData) return 0;
    const total = excelEditData.components.reduce((sum, comp) => sum + (parseFloat(comp.quantity) || 0), 0);
    return parseFloat(total.toFixed(4));
  };

  const validateExcelEditData = () => {
    if (!excelEditData) return '';
    const total = getExcelComponentsTotal();
    const base = parseFloat(excelEditData.base_composition_qty) || 0;
    if (excelEditData.product_name.trim().length === 0) return 'Product name cannot be empty';
    if (excelEditData.components.length === 0) return 'Add at least one component';
    if (excelEditData.components.some(c => !c.code.trim())) return 'All component codes must be filled';
    if (Math.abs(total - base) > 0.01) return `Component total (${total}) must equal base composition (${base})`;
    return '';
  };

  const setExcelBaseToSum = () => {
    if (!excelEditData) return;
    const total = getExcelComponentsTotal();
    setExcelEditData(prev => ({ ...prev, base_composition_qty: total }));
    setExcelValidationMsg('');
  };

  const addExcelComponent = () => {
    if (!excelEditData) return;
    setExcelEditData(prev => ({
      ...prev,
      components: [...prev.components, { code: '', quantity: 0, unit: prev.unit || 'g' }]
    }));
  };

  const deleteExcelComponent = (index) => {
    if (!excelEditData) return;
    setExcelEditData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const updateExcelComponentCode = (index, value) => {
    setExcelEditData(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === index ? { ...c, code: value } : c)
    }));
  };

  const updateExcelComponentQty = (index, value) => {
    const qty = parseFloat(value);
    setExcelEditData(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === index ? { ...c, quantity: isNaN(qty) ? 0 : qty } : c)
    }));
  };
  
  const handleApproveExcel = async () => {
    // Use the edited data if available
    const payload = excelEditData || excelData;
    if (!payload) return;
    const msg = validateExcelEditData();
    setExcelValidationMsg(msg);
    if (msg) return;
    
    try {
      setUploading(true);
      console.log('[ChemicalsDashboard] Approve Excel payload:', payload);
      // Call the approve endpoint
      const response = await fetch('http://localhost:8000/excel/approve-formulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        },
        body: JSON.stringify(payload)
      });
      
      console.log('[ChemicalsDashboard] Approve response status:', response.status, 'ok:', response.ok);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ChemicalsDashboard] Approve error JSON:', errorData);
        throw new Error(errorData.detail || 'Failed to approve formulation');
      }
      
      const result = await response.json();
      console.log('[ChemicalsDashboard] Approve result:', result);
      setExcelPreview(null);
      setExcelData(null);
      setExcelEditData(null);
      setExcelValidationMsg('');
      
      // Refresh data
      console.log('[ChemicalsDashboard] Refreshing data after approve');
      loadInitialData();
      
      addNotification({
        type: 'success',
        title: 'Formulation Approved',
        message: result.message,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('[ChemicalsDashboard] Error approving Excel:', err);
      addNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to approve formulation: ${err.message}`,
        timestamp: new Date()
      });
    } finally {
      console.log('[ChemicalsDashboard] handleApproveExcel end (uploading=false)');
      setUploading(false);
    }
  };
  
  // Assignment management functions
  const handleCreateAssignment = async (assignmentData) => {
    try {
      console.log('Creating assignment:', assignmentData);
      
      // Transform assignment data to match backend schema
      const backendAssignmentData = {
        product_id: assignmentData.productId,
        assigned_to_user_id: assignmentData.assigned_to_id,
        quantity_requested: parseFloat(assignmentData.targetQuantity),
        unit: assignmentData.targetUnit,
        time_allotted_minutes: parseInt(assignmentData.timeLimit)
      };

      console.log('Sending to backend:', backendAssignmentData);
      console.log('Auth token:', localStorage.getItem('firebase_token') ? 'Present' : 'Missing');
      console.log('User info:', userInfo);

      // Make actual API call to create assignment
      const response = await fetch('http://localhost:8000/assignments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        },
        body: JSON.stringify(backendAssignmentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Assignment creation failed:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
        }
      }

      const newAssignment = await response.json();
      console.log('Assignment created successfully:', newAssignment);
      
      // Fetch assignment details to get components and progress
      const detailsResponse = await fetch(`http://localhost:8000/assignments/${newAssignment.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        }
      });
      
      if (detailsResponse.ok) {
        const assignmentDetails = await detailsResponse.json();
        console.log('Assignment details:', assignmentDetails);
        
        // Transform the assignment details to match frontend format
        const frontendAssignment = {
          id: newAssignment.id,
          product_name: assignmentData.product_name,
          assigned_to_name: assignmentData.assigned_to_name,
          target_quantity: assignmentData.targetQuantity,
          target_unit: assignmentData.targetUnit,
          baseComposition: assignmentData.baseComposition,
          baseUnit: assignmentData.baseUnit,
          components: assignmentDetails.progress || [],
          status: newAssignment.status,
          created_at: newAssignment.created_at,
          timeLimit: newAssignment.time_allotted_minutes,
          otp: newAssignment.otp_token,
          is_expired: assignmentDetails.is_expired || false,
          time_remaining: assignmentDetails.time_remaining || 0
        };
        
        console.log('Frontend assignment created:', frontendAssignment);
        setAssignments(prev => [...prev, frontendAssignment]);
        
        // Also refresh the assignments list to ensure consistency
        loadAssignments();
      } else {
        // Fallback: add assignment without details
        setAssignments(prev => [...prev, {
          id: newAssignment.id,
          product_name: assignmentData.product_name,
          assigned_to_name: assignmentData.assigned_to_name,
          target_quantity: assignmentData.targetQuantity,
          target_unit: assignmentData.targetUnit,
          baseComposition: assignmentData.baseComposition,
          baseUnit: assignmentData.baseUnit,
          components: [],
          status: newAssignment.status,
          created_at: newAssignment.created_at,
          timeLimit: newAssignment.time_allotted_minutes,
          otp: newAssignment.otp_token
        }]);
      }
      
      setShowAssignmentForm(false);
      
      addNotification({
        type: 'success',
        title: 'Assignment Created',
        message: `Assignment created for ${assignmentData.product_name}`,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error creating assignment:', err);
      addNotification({
        type: 'error',
        title: 'Assignment Failed',
        message: `Failed to create assignment: ${err.message}`,
        timestamp: new Date()
      });
    }
  };

  const handleUpdateProgress = async (assignmentId, componentId, completed) => {
    try {
      setAssignments(prev => prev.map(assignment => {
        if (assignment.id === assignmentId) {
          const updatedComponents = assignment.components.map(comp => 
            comp.id === componentId ? { ...comp, completed } : comp
          );
          const progress = (updatedComponents.filter(c => c.completed).length / updatedComponents.length) * 100;
          return { ...assignment, components: updatedComponents, progress };
        }
        return assignment;
      }));
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    try {
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: 'completed', completed_at: new Date().toISOString() }
          : assignment
      ));
      
      addNotification({
        type: 'success',
        title: 'Assignment Completed',
        message: 'Formulation assignment completed successfully',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error completing assignment:', err);
    }
  };

  const handleRequestExtension = async (assignmentId) => {
    try {
      // Mock extension request - replace with actual API call
      addNotification({
        type: 'info',
        title: 'Extension Requested',
        message: 'Time extension request sent to admin',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error requesting extension:', err);
    }
  };

  const handleViewAssignmentDetails = async (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    try {
      console.log('Fetching assignment details for:', assignmentId);
      
      // Fetch complete assignment details from backend
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        }
      });
      
      if (response.ok) {
        const assignmentDetails = await response.json();
        console.log('Assignment details fetched:', assignmentDetails);
        
        // Load formulation components for this assignment
        const componentsResponse = await fetch(`${API_BASE}/assignments/${assignmentId}/formulation-components`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
          }
        });
        
        let formulationComponents = [];
        if (componentsResponse.ok) {
          formulationComponents = await componentsResponse.json();
          console.log('Formulation components loaded:', formulationComponents);
        } else {
          console.error('Failed to load formulation components:', componentsResponse.status);
        }
        
        // Transform the assignment details to include all necessary data
        const completeAssignment = {
          ...assignment,
          product_name: assignmentDetails.assignment?.product?.name || assignment.product_name,
          assigned_to_name: assignment.assigned_to_name,
          target_quantity: assignmentDetails.assignment?.quantity_requested || assignment.target_quantity,
          target_unit: assignmentDetails.assignment?.unit || assignment.target_unit,
          baseComposition: assignmentDetails.assignment?.product?.base_composition_qty || assignment.baseComposition,
          baseUnit: assignmentDetails.assignment?.product?.unit || assignment.baseUnit,
          components: formulationComponents, // Use the loaded formulation components
          status: assignmentDetails.assignment?.status || assignment.status,
          created_at: assignmentDetails.assignment?.created_at || assignment.created_at,
          timeLimit: assignmentDetails.assignment?.time_allotted_minutes || assignment.timeLimit,
          otp: assignmentDetails.assignment?.otp_token || assignment.otp,
          is_expired: assignmentDetails.is_expired || false,
          time_remaining: assignmentDetails.time_remaining || 0
        };
        
        console.log('Complete assignment for modal:', completeAssignment);
        setCurrentAssignment(completeAssignment);
        setShowAssignmentDetails(true);
      } else {
        console.error('Failed to fetch assignment details:', response.status);
        // Fallback to basic assignment data
        setCurrentAssignment(assignment);
        setShowAssignmentDetails(true);
      }
    } catch (err) {
      console.error('Error fetching assignment details:', err);
      // Fallback to basic assignment data
      setCurrentAssignment(assignment);
      setShowAssignmentDetails(true);
    }
  };

  const handleExtendAssignmentTime = async (assignmentId, additionalMinutes) => {
    try {
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, time_limit: assignment.time_limit + additionalMinutes }
          : assignment
      ));
      
      addNotification({
        type: 'success',
        title: 'Time Extended',
        message: `Assignment time extended by ${additionalMinutes} minutes`,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error extending assignment time:', err);
    }
  };
  
  // Helper functions for formulations management
  const getUniqueFormulationProducts = () => {
    console.log('🔍 getUniqueFormulationProducts called - showing ALL products');
    console.log('📊 Current formulations:', formulations);
    console.log('📦 Current chemical products:', chemicalProducts);
    
    // Return ALL chemical products, not just those with formulations
    const allProducts = chemicalProducts.map(product => ({
      id: product.id,
      name: product.name,
      base_composition_qty: product.base_composition_qty,
      unit: product.unit
    }));
    
    console.log('✅ All products found:', allProducts);
    return allProducts;
  };

  const getFormulationComponentsCount = (productId) => {
    return formulations.filter(f => f.product_id === productId).length;
  };

  const getFormulationDetails = (productId) => {
    console.log('🔍 getFormulationDetails called for product ID:', productId);
    console.log('📦 Available chemical products:', chemicalProducts);
    console.log('🧪 Available formulations:', formulations);
    
    const product = chemicalProducts.find(p => p.id === productId);
    console.log('📦 Found product:', product);
    
    const productFormulations = formulations.filter(f => f.product_id === productId);
    console.log('🧪 Found formulations for product:', productFormulations);
    
    const result = {
      product,
      components: productFormulations.map(f => {
        const chemical = chemicals.find(c => c.id === f.component_chemical_id);
        console.log(`🔍 Looking for chemical ID ${f.component_chemical_id}:`, chemical);
        return {
          id: f.id,
          chemical_name: chemical?.name || `Chemical ${f.component_chemical_id}`,
          quantity_required: f.quantity_required,
          unit: f.unit
        };
      })
    };
    
    console.log('✅ Final result:', result);
    return result;
  };

  const handleViewFormulationDetails = (productId) => {
    const details = getFormulationDetails(productId);
    console.log('🔍 Opening formulation details for product:', productId);
    console.log('📦 Product details:', details);
    
    if (details && details.product) {
      setSelectedFormulationProduct(details);
      // Ensure scaledQuantity is properly initialized with a valid number
      const baseQty = details.product.base_composition_qty || 0;
      setScaledQuantity(baseQty);
      console.log('✅ Set scaled quantity to:', baseQty);
      
      // Initialize edit form data
      setEditFormData({
        product: {
          name: details.product.name,
          base_composition_qty: details.product.base_composition_qty,
          unit: details.product.unit
        },
        components: details.components.map(comp => ({
          name: comp.chemical_name,
          quantity: comp.quantity_required,
          unit: comp.unit
        }))
      });
      
      setShowFormulationDetails(true);
    } else {
      console.error('❌ Invalid formulation details:', details);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Could not load formulation details',
        timestamp: new Date()
      });
    }
  };

  const handleEditFormulation = (productId) => {
    console.log('🔍 Edit formulation requested for product ID:', productId);
    
    // Initialize edit form data if not already set
    if (!editFormData && selectedFormulationProduct) {
      setEditFormData({
        product: {
          name: selectedFormulationProduct.product.name,
          base_composition_qty: selectedFormulationProduct.product.base_composition_qty,
          unit: selectedFormulationProduct.product.unit
        },
        components: selectedFormulationProduct.components.map(comp => ({
          name: comp.chemical_name,
          quantity: comp.quantity_required,
          unit: comp.unit
        }))
      });
    }
    
    // Toggle edit mode for the current modal
    setEditingFormulationProduct(productId);
    
    addNotification({
      type: 'success',
      title: 'Edit Mode',
      message: 'Formulation is now in edit mode. Make your changes and click Save.',
      timestamp: new Date()
    });
  };

  const handleSaveFormulation = async () => {
    console.log('💾 Saving formulation changes...');
    
    if (!editFormData) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No changes to save',
        timestamp: new Date()
      });
      return;
    }

    setSavingFormulation(true);

    try {
      // Validate the data before saving
      const { product, components } = editFormData;
      
      if (!product.name.trim()) {
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'Product name cannot be empty',
          timestamp: new Date()
        });
        return;
      }
      
      if (components.length === 0) {
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'At least one component is required',
          timestamp: new Date()
        });
        return;
      }
      
      // Check for empty component names
      const emptyComponents = components.filter(comp => !comp.name.trim());
      if (emptyComponents.length > 0) {
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'All component names must be filled',
          timestamp: new Date()
        });
        return;
      }
      
      console.log('📊 Changes to save:', editFormData);
      console.log('📦 Product:', product);
      console.log('🧪 Components:', components);
      
      const productId = selectedFormulationProduct.product.id;
      
      // Step 1: Update the product information
      const productUpdateResponse = await fetch(`http://localhost:8000/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: product.name,
          base_composition_qty: product.base_composition_qty,
          unit: product.unit
        })
      });
      
      if (!productUpdateResponse.ok) {
        const errorData = await productUpdateResponse.json();
        throw new Error(`Failed to update product: ${errorData.detail || 'Unknown error'}`);
      }
      
      console.log('✅ Product updated successfully');
      
      // Step 2: Update formulations
      // For simplicity, we'll delete all existing formulations and create new ones
      // This ensures consistency and handles additions/deletions/modifications
      
      // Get current formulations for this product
      const currentFormulations = selectedFormulationProduct.components;
      
      // Delete existing formulations
      for (const formulation of currentFormulations) {
        const deleteResponse = await fetch(`http://localhost:8000/formulations/${formulation.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          console.warn(`⚠️ Failed to delete formulation ${formulation.id}`);
        }
      }
      
      console.log('🗑️ Deleted existing formulations');
      
      // Create new formulations
      for (const component of components) {
        // First, find or create the chemical
        let chemicalId = null;
        
        // Try to find existing chemical by name
        const existingChemical = chemicals.find(c => c.name.toLowerCase() === component.name.toLowerCase());
        if (existingChemical) {
          chemicalId = existingChemical.id;
        } else {
          // Create new chemical
          const chemicalResponse = await fetch('http://localhost:8000/chemicals/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: component.name,
              unit: component.unit,
              available_qty: 0,
              threshold_qty: 0,
              is_manufactured: false
            })
          });
          
          if (chemicalResponse.ok) {
            const newChemical = await chemicalResponse.json();
            chemicalId = newChemical.id;
            console.log(`✅ Created new chemical: ${component.name} (ID: ${chemicalId})`);
          } else {
            console.error(`❌ Failed to create chemical: ${component.name}`);
            continue;
          }
        }
        
        // Create formulation
        const formulationResponse = await fetch('http://localhost:8000/formulations/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: productId,
            component_chemical_id: chemicalId,
            quantity_required: component.quantity,
            unit: component.unit
          })
        });
        
        if (!formulationResponse.ok) {
          const errorData = await formulationResponse.json();
          console.error(`❌ Failed to create formulation for ${component.name}:`, errorData);
        } else {
          console.log(`✅ Created formulation for ${component.name}`);
        }
      }
      
      console.log('✅ All formulations updated successfully');
      
      addNotification({
        type: 'success',
        title: 'Changes Saved',
        message: `Formulation "${product.name}" updated successfully with ${components.length} components!`,
        timestamp: new Date()
      });
      
      // Exit edit mode
      setEditingFormulationProduct(null);
      
      // Refresh the data
      await loadInitialData();
      
    } catch (error) {
      console.error('❌ Error saving formulation:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to save changes: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setSavingFormulation(false);
    }
  };

  const handleCancelEdit = () => {
    console.log('❌ Canceling edit mode...');
    
    // Reset to original data
    if (selectedFormulationProduct) {
      setEditFormData({
        product: {
          name: selectedFormulationProduct.product.name,
          base_composition_qty: selectedFormulationProduct.product.base_composition_qty,
          unit: selectedFormulationProduct.product.unit
        },
        components: selectedFormulationProduct.components.map(comp => ({
          name: comp.chemical_name,
          quantity: comp.quantity_required,
          unit: comp.unit
        }))
      });
    }
    
    // Exit edit mode
    setEditingFormulationProduct(null);
    
    addNotification({
      type: 'info',
      title: 'Edit Cancelled',
      message: 'Changes have been discarded',
      timestamp: new Date()
    });
  };

  const handleAddComponentToFormulation = () => {
    console.log('➕ Adding new component to formulation...');
    console.log('🔍 editFormData:', editFormData);
    console.log('🔍 selectedFormulationProduct:', selectedFormulationProduct);
    
    if (!editFormData) {
      console.error('❌ editFormData is null or undefined');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Cannot add component: Edit data not initialized. Please try again.',
        timestamp: new Date()
      });
      return;
    }
    
    if (!selectedFormulationProduct) {
      console.error('❌ selectedFormulationProduct is null or undefined');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Cannot add component: Product data not available.',
        timestamp: new Date()
      });
      return;
    }
    
    const newComponent = {
      name: '',
      quantity: 0,
      unit: selectedFormulationProduct.product.unit // Use same unit as product
    };
    
    console.log('➕ Adding new component:', newComponent);
    
    setEditFormData(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
    
    addNotification({
      type: 'success',
      title: 'Component Added',
      message: 'New component added. Fill in the details and save.',
      timestamp: new Date()
    });
  };

  const handleDeleteComponent = (index) => {
    console.log(`🗑️ Deleting component at index: ${index}`);
    
    if (!editFormData) return;
    
    const componentName = editFormData.components[index]?.name || `Component ${index + 1}`;
    
    if (window.confirm(`Are you sure you want to delete "${componentName}" from this formulation?`)) {
      setEditFormData(prev => ({
        ...prev,
        components: prev.components.filter((_, i) => i !== index)
      }));
      
      addNotification({
        type: 'success',
        title: 'Component Deleted',
        message: `"${componentName}" has been removed from the formulation.`,
        timestamp: new Date()
      });
    }
  };

  const handleDeleteFormulationProduct = async (productId) => {
    // Find the product name for confirmation message
    const product = chemicalProducts.find(p => p.id === productId);
    const productName = product ? product.name : `Product ID ${productId}`;
    
    if (window.confirm(`Are you sure you want to delete "${productName}" and all its formulation components?\n\nThis will permanently delete:\n- The chemical product\n- All linked formulations\n- All component relationships\n\nThis action cannot be undone.`)) {
      try {
        console.log(`🗑️ Deleting product: ${productName} (ID: ${productId})`);
        
        const response = await fetch(`http://localhost:8000/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Delete successful:', result);
          
          // Refresh the data
          await loadInitialData();
          
          addNotification({
            type: 'success',
            title: 'Product Deleted',
            message: `"${productName}" and ${result.deleted_formulations} formulation components deleted successfully`,
            timestamp: new Date()
          });
        } else {
          const errorData = await response.json();
          console.error('❌ Delete failed:', errorData);
          throw new Error(errorData.detail || 'Failed to delete product');
        }
      } catch (err) {
        console.error('❌ Error deleting formulation product:', err);
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: `Could not delete "${productName}": ${err.message}`,
          timestamp: new Date()
        });
      }
    }
  };

  // Simple data display - no complex filtering
  console.log('Chemicals data:', {
    total: chemicals.length,
    chemicals: chemicals
  });
  console.log('Chemicals state type:', typeof chemicals);
  console.log('Chemicals state is array:', Array.isArray(chemicals));
  
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading Chemical Inventory...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Chemical Inventory Management</h1>
        <div className={styles.headerActions}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${wsConnected ? styles.connected : styles.disconnected}`}></span>
            {wsConnected ? 'Live Connected' : 'Disconnected'}
          </div>
          <button 
            className={styles.refreshBtn}
            onClick={loadInitialData}
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className={styles.notifications}>
          {notifications.map((notification, index) => (
            <div key={index} className={`${styles.notification} ${styles[notification.type]}`}>
              <span className={styles.notificationTitle}>{notification.title}</span>
              <span className={styles.notificationMessage}>{notification.message}</span>
              <button 
                className={styles.notificationClose}
                onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className={isMobile ? styles.tabNavigationMobile : styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'chemicals' ? styles.active : ''}`}
          onClick={() => setActiveTab('chemicals')}
        >
          <FlaskConical size={20} />
          Chemicals Management
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'formulations' ? styles.active : ''}`}
          onClick={() => setActiveTab('formulations')}
        >
          <FileSpreadsheet size={20} />
          Formulations Management
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'assignments' ? styles.active : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <Users size={20} />
          Product Assignment
        </button>
      </div>
      
      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Chemicals Management Tab */}
        {activeTab === 'chemicals' && (
          <div className={styles.chemicalsTab}>
            <div className={styles.tabHeader}>
              <h2>Chemicals Management</h2>
              <div className={styles.headerActions}>
                <button 
                  className={styles.refreshBtn}
                  onClick={loadInitialData}
                  title="Refresh Data"
                >
                  <RefreshCw size={20} />
                  Refresh
                </button>
                <button 
                  className={styles.addButton}
                  onClick={() => setShowChemicalForm(true)}
                >
                  <Plus size={20} />
                  Add Chemical
                </button>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className={styles.searchFilters}>
              <div className={styles.searchBox}>
                <Search size={20} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search chemicals by name..."
                  value={chemicalSearchTerm}
                  onChange={(e) => setChemicalSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
                {chemicalSearchTerm && (
                  <button
                    className={styles.clearSearchBtn}
                    onClick={() => setChemicalSearchTerm('')}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <select
                value={chemicalFilterType}
                onChange={(e) => setChemicalFilterType(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="raw">Raw Materials</option>
                <option value="manufactured">Manufactured</option>
                <option value="below_threshold">Below Threshold</option>
              </select>
            </div>
            
            {/* Chemicals Table */}
            <div className={styles.tableContainer}>
              {(() => {
                const filteredChemicals = getFilteredChemicals();
                const paginatedChemicals = getPaginatedChemicals();
                const totalPages = getTotalChemicalPages();
                
                return filteredChemicals.length === 0 ? (
                  <div className={styles.noData}>
                    <p>
                      {chemicals.length === 0 
                        ? `No chemicals found. ${loading ? 'Loading...' : 'No data available.'}`
                        : `No chemicals match your search criteria. Showing 0 of ${chemicals.length} chemicals.`
                      }
                    </p>
                    {(chemicalSearchTerm || chemicalFilterType !== 'all') && (
                      <button
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                          setChemicalSearchTerm('');
                          setChemicalFilterType('all');
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Available Qty</th>
                        <th>Threshold Qty</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedChemicals.map(chemical => (
                      <tr key={chemical.id}>
                        <td>{chemical.name}</td>
                        <td>{chemical.unit}</td>
                        <td className={chemical.available_qty <= chemical.threshold_qty ? styles.lowStock : ''}>
                          {chemical.available_qty}
                        </td>
                        <td>{chemical.threshold_qty}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${chemical.is_manufactured ? styles.manufactured : styles.raw}`}>
                            {chemical.is_manufactured ? 'Manufactured' : 'Raw'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.editBtn}
                              onClick={() => setEditingChemical(chemical)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteChemical(chemical.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              
              {/* Pagination Controls */}
              {(() => {
                const filteredChemicals = getFilteredChemicals();
                const totalPages = getTotalChemicalPages();
                
                return totalPages > 1 && (
                  <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                      Showing {((chemicalsCurrentPage - 1) * chemicalsPerPage) + 1} to {Math.min(chemicalsCurrentPage * chemicalsPerPage, filteredChemicals.length)} of {filteredChemicals.length} chemicals
                    </div>
                    <div className={styles.paginationControls}>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setChemicalsCurrentPage(1)}
                        disabled={chemicalsCurrentPage === 1}
                        title="First page"
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setChemicalsCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={chemicalsCurrentPage === 1}
                        title="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <div className={styles.pageNumbers}>
                        {(() => {
                          const pages = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, chemicalsCurrentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                className={`${styles.pageBtn} ${chemicalsCurrentPage === i ? styles.activePage : ''}`}
                                onClick={() => setChemicalsCurrentPage(i)}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}
                      </div>
                      
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setChemicalsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={chemicalsCurrentPage === totalPages}
                        title="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setChemicalsCurrentPage(totalPages)}
                        disabled={chemicalsCurrentPage === totalPages}
                        title="Last page"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Formulations Management Tab */}
        {activeTab === 'formulations' && (
          <div className={styles.formulationsTab}>
            <div className={styles.tabHeader}>
              <h2>Formulations Management</h2>
              <div className={styles.headerActions}>
                <button 
                  className={styles.refreshBtn}
                  onClick={loadInitialData}
                  title="Refresh Data"
                >
                  <RefreshCw size={20} />
                  Refresh
                </button>
                <button 
                  className={styles.uploadBtn}
                  onClick={() => setShowExcelUpload(true)}
                >
                  <Upload size={20} />
                  Upload Excel
                </button>
                <button 
                  className={styles.addButton}
                  onClick={() => setShowFormulationForm(true)}
                >
                  <Plus size={20} />
                  Add Formulation
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className={styles.searchFilters}>
              <div className={styles.searchBox}>
                <Search size={20} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={formulationSearchTerm}
                  onChange={(e) => setFormulationSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
                {formulationSearchTerm && (
                  <button
                    className={styles.clearSearchBtn}
                    onClick={() => setFormulationSearchTerm('')}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Excel Preview */}
            {excelPreview && excelEditData && (
              <div className={styles.excelPreview}>
                <h3>Excel Preview - Edit & Approve</h3>
                
                {/* Product Information */}
                <div className={styles.previewCard}>
                  <div className={styles.cardHeader}>
                    <h4>Product Information</h4>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.infoRow}>
                      <label>Product Name:</label>
                      <input
                        type="text"
                        value={excelEditData.product_name}
                        onChange={(e) => setExcelEditData(prev => ({ ...prev, product_name: e.target.value }))}
                        className={styles.editInput}
                      />
                    </div>
                    <div className={styles.infoRow}>
                      <label>Base Composition ({excelEditData.unit}):</label>
                      <div className={styles.editQuantityGroup}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={excelEditData.base_composition_qty}
                          onChange={(e) => setExcelEditData(prev => ({ ...prev, base_composition_qty: parseFloat(e.target.value) || 0 }))}
                          className={styles.editInput}
                        />
                        <button type="button" className={styles.autoBtn} onClick={setExcelBaseToSum}>Auto</button>
                      </div>
                    </div>
                    <div className={styles.infoRow}>
                      <label>Components Total:</label>
                      <span className={styles.totalValue}>{getExcelComponentsTotal()} {excelEditData.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Components Table */}
                <div className={styles.previewCard}>
                  <div className={styles.cardHeader}>
                    <h4>Component Chemicals ({excelEditData.components.length} components)</h4>
                    <button className={styles.addButton} type="button" onClick={addExcelComponent}>
                      <Plus size={16}/> Add Component
                    </button>
                  </div>
                  
                  <div className={styles.componentsTableContainer}>
                    <table className={styles.componentsTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Chemical Code</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelEditData.components.map((comp, index) => (
                          <tr key={index}>
                            <td className={styles.serialNumber}>{index + 1}</td>
                            <td>
                              <input
                                type="text"
                                value={comp.code}
                                onChange={(e) => updateExcelComponentCode(index, e.target.value)}
                                placeholder="Chemical code"
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={comp.quantity}
                                onChange={(e) => updateExcelComponentQty(index, e.target.value)}
                                className={styles.tableInput}
                              />
                            </td>
                            <td className={styles.unitCell}>{comp.unit}</td>
                            <td>
                              <button 
                                className={styles.deleteBtn} 
                                type="button" 
                                onClick={() => deleteExcelComponent(index)} 
                                title="Delete component"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Validation Messages */}
                {excelValidationMsg && (
                  <div className={styles.validationMessage}>{excelValidationMsg}</div>
                )}

                <div className={styles.previewActions}>
                  <button 
                    className={styles.approveBtn}
                    onClick={handleApproveExcel}
                    disabled={uploading || !!validateExcelEditData()}
                  >
                    {uploading ? 'Processing...' : 'Approve & Create'}
                  </button>
                  <button 
                    className={styles.cancelBtn}
                    onClick={() => {
                      setExcelPreview(null);
                      setExcelData(null);
                      setExcelEditData(null);
                      setExcelValidationMsg('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
                        {/* Formulations Table - Product Names Only */}
            <div className={styles.tableContainer}>
                          <div className={styles.debugInfo}>
              <p><strong>Debug Info:</strong></p>
              <p>Formulations count: {formulations.length}</p>
              <p>Chemical Products count: {chemicalProducts.length}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              <p>Unique products: {getUniqueFormulationProducts().length}</p>
              {formulations.length === 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px' }}>
                  <p><strong>No Formulations Found</strong></p>
                  <p>To see formulations here, you need to:</p>
                  <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                    <li>Create a chemical product first (in Chemicals Management)</li>
                    <li>Add component chemicals</li>
                    <li>Create a formulation linking them</li>
                  </ol>
                  <button 
                    onClick={() => setShowFormulationForm(true)}
                    style={{ 
                      background: '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    Create Your First Formulation
                  </button>
                </div>
              )}
              
              {/* Manual API Test */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px' }}>
                <p><strong>🔍 API Debug Test</strong></p>
                <p>Chemical Products count: {chemicalProducts.length}</p>
                <p>Formulations count: {formulations.length}</p>
                <button 
                  onClick={async () => {
                    try {
                      console.log('🧪 Manual API test started...');
                      const testProducts = await fetchChemicalProducts();
                      console.log('🧪 Manual API test result:', testProducts);
                      console.log('🧪 Test products type:', typeof testProducts);
                      console.log('🧪 Test products is array:', Array.isArray(testProducts));
                      console.log('🧪 Test products length:', testProducts?.length || 'undefined');
                      
                      if (testProducts && Array.isArray(testProducts)) {
                        setChemicalProducts(testProducts);
                        console.log('✅ Manual test: Chemical products updated');
                      } else {
                        console.error('❌ Manual test: Invalid data format');
                      }
                    } catch (err) {
                      console.error('❌ Manual test failed:', err);
                    }
                  }}
                  style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                >
                  🧪 Test Chemical Products API
                </button>
              </div>
            </div>
              
              {(() => {
                const filteredFormulations = getFilteredFormulations();
                const paginatedFormulations = getPaginatedFormulations();
                const totalPages = getTotalFormulationPages();
                
                return filteredFormulations.length === 0 ? (
                  <div className={styles.noData}>
                    <p>
                      {getUniqueFormulationProducts().length === 0 
                        ? `No chemical products found. ${loading ? 'Loading...' : 'No data available.'}`
                        : `No products match your search criteria. Showing 0 of ${filteredFormulations.length} products.`
                      }
                    </p>
                    {formulationSearchTerm && (
                      <button
                        className={styles.clearFiltersBtn}
                        onClick={() => {
                          setFormulationSearchTerm('');
                        }}
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Base Composition</th>
                        <th>Components Count</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFormulations.map(product => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                        </td>
                        <td>
                          {product.base_composition_qty} {product.unit}
                        </td>
                        <td>
                          {getFormulationComponentsCount(product.id)} components
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.viewBtn}
                              onClick={() => handleViewFormulationDetails(product.id)}
                              title="View Details"
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteFormulationProduct(product.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              
              {/* Pagination Controls */}
              {(() => {
                const filteredFormulations = getFilteredFormulations();
                const totalPages = getTotalFormulationPages();
                
                return totalPages > 1 && (
                  <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                      Showing {((formulationsCurrentPage - 1) * formulationsPerPage) + 1} to {Math.min(formulationsCurrentPage * formulationsPerPage, filteredFormulations.length)} of {filteredFormulations.length} products
                    </div>
                    <div className={styles.paginationControls}>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setFormulationsCurrentPage(1)}
                        disabled={formulationsCurrentPage === 1}
                        title="First page"
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setFormulationsCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={formulationsCurrentPage === 1}
                        title="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <div className={styles.pageNumbers}>
                        {(() => {
                          const pages = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, formulationsCurrentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                className={`${styles.pageBtn} ${formulationsCurrentPage === i ? styles.activePage : ''}`}
                                onClick={() => setFormulationsCurrentPage(i)}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}
                      </div>
                      
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setFormulationsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={formulationsCurrentPage === totalPages}
                        title="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        className={styles.paginationBtn}
                        onClick={() => setFormulationsCurrentPage(totalPages)}
                        disabled={formulationsCurrentPage === totalPages}
                        title="Last page"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Product Assignment Tab */}
        {activeTab === 'assignments' && (
            <ProductAssignmentTab userInfo={userInfo} wsConnected={wsConnected} />
        )}
      </div>
      
      {/* Modals */}
      {(showChemicalForm || editingChemical) && (
        <ChemicalFormModal
          chemical={editingChemical}
          onSubmit={editingChemical ? 
            (data) => handleUpdateChemical(editingChemical.id, data) : 
            handleCreateChemical
          }
          onClose={() => {
            setShowChemicalForm(false);
            setEditingChemical(null);
          }}
        />
      )}
      
      {showFormulationForm && (
        <FormulationFormModal
          formulation={editingFormulation}
          chemicals={chemicals}
          products={chemicalProducts}
          onSubmit={editingFormulation ? 
            (data) => handleUpdateFormulation(editingFormulation.id, data) : 
            handleCreateFormulation
          }
          onClose={() => {
            setShowFormulationForm(false);
            setEditingFormulation(null);
          }}
        />
      )}
      
      {showAssignmentForm && (
        <AssignmentFormModal
          isOpen={showAssignmentForm}
          products={chemicalProducts}
          users={users}
          formulations={formulations}
          chemicals={chemicals}
          onSubmit={handleCreateAssignment}
          onClose={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
          }}
          loading={loading}
        />
      )}
      
      {/* Assignment Details Modal */}
      {showAssignmentDetails && currentAssignment && (
        <div className={styles.modalOverlay}>
          <div className={styles.assignmentDetailsModal}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <div className={styles.productTitle}>
                  <h3>📦 {currentAssignment.product_name}</h3>
                  <span className={styles.productSubtitle}>Assignment Details</span>
                </div>
                <button 
                  className={styles.closeBtn} 
                  onClick={() => setShowAssignmentDetails(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className={styles.modalContent}>
              {/* Assignment Info */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h4>📋 Assignment Information</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Assigned to:</span>
                    <span className={styles.infoValue}>{currentAssignment.assigned_to_name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Target Quantity:</span>
                    <span className={styles.infoValue}>{currentAssignment.target_quantity} {currentAssignment.target_unit}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Base Composition:</span>
                    <span className={styles.infoValue}>{currentAssignment.baseComposition} {currentAssignment.baseUnit}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Time Limit:</span>
                    <span className={styles.infoValue}>{currentAssignment.timeLimit} minutes</span>
                  </div>
                </div>
              </div>
              
              {/* Components List */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h4>🧪 Formulation Components</h4>
                  <span className={styles.cardSubtitle}>Scaled quantities for target production</span>
                </div>
                <div className={styles.cardContent}>
                  {currentAssignment.components && currentAssignment.components.length > 0 ? (
                    <div className={styles.componentsList}>
                      {currentAssignment.components.map((component, index) => {
                        // Use the correct field names from the formulation components API
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
                      })}
                    </div>
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
      
      {/* Formulation Details Modal */}
      {showFormulationDetails && selectedFormulationProduct && (
        <div className={styles.modalOverlay}>
          <div className={styles.formulationDetailsModal}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <div className={styles.productTitle}>
                  <h3>📦 {selectedFormulationProduct.product.name}</h3>
                  <span className={styles.productSubtitle}>Formulation Details</span>
                </div>
                <button 
                  className={styles.closeBtn}
                  onClick={() => setShowFormulationDetails(false)}
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className={styles.modalContent}>
              {/* Product Information Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h4>📊 Product Information</h4>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Product Name:</span>
                    {editingFormulationProduct === selectedFormulationProduct.product.id ? (
                      <input
                        type="text"
                        value={editFormData?.product?.name || selectedFormulationProduct.product.name}
                        onChange={(e) => setEditFormData(prev => ({
                          ...prev,
                          product: { ...prev?.product, name: e.target.value }
                        }))}
                        className={styles.editInput}
                      />
                    ) : (
                      <span className={styles.infoValue}>{selectedFormulationProduct.product.name}</span>
                    )}
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Base Composition:</span>
                    {editingFormulationProduct === selectedFormulationProduct.product.id ? (
                      <div className={styles.editQuantityGroup}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editFormData?.product?.base_composition_qty || selectedFormulationProduct.product.base_composition_qty}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            product: { ...prev?.product, base_composition_qty: parseFloat(e.target.value) || 0 }
                          }))}
                          className={styles.editInput}
                        />
                        <span className={styles.unit}>{selectedFormulationProduct.product.unit}</span>
                      </div>
                    ) : (
                      <span className={styles.infoValue}>
                        <strong>{selectedFormulationProduct.product.base_composition_qty} {selectedFormulationProduct.product.unit}</strong>
                      </span>
                    )}
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Components:</span>
                    <span className={styles.infoValue}>
                      <strong>{selectedFormulationProduct.components.length} chemicals</strong>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Quantity Scaling Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <h4>⚖️ Quantity Scaling</h4>
                  <span className={styles.cardSubtitle}>Scale the formulation to different quantities</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.scalingControls}>
                    <div className={styles.scalingInput}>
                      <label>Target Quantity:</label>
                      <div className={styles.inputGroup}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={scaledQuantity || 0}
                          onChange={(e) => setScaledQuantity(parseFloat(e.target.value) || 0)}
                          placeholder="Enter target quantity"
                        />
                        <span className={styles.unit}>{selectedFormulationProduct.product.unit}</span>
                      </div>
                    </div>
                    <button 
                      className={styles.resetBtn}
                      onClick={() => setScaledQuantity(selectedFormulationProduct.product.base_composition_qty)}
                      title="Reset to base composition"
                    >
                      <RefreshCw size={16} />
                      Reset to Base
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Components List Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.headerLeft}>
                    <h4>🧪 Component Chemicals</h4>
                    <span className={styles.cardSubtitle}>Chemical components and their quantities</span>
                  </div>
                  {editingFormulationProduct === selectedFormulationProduct.product.id && (
                    <button 
                      className={styles.addComponentBtn}
                      onClick={() => handleAddComponentToFormulation()}
                      title="Add new component chemical"
                    >
                      <Plus size={16} />
                      Add Component
                    </button>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.componentsGrid}>
                    {(editingFormulationProduct === selectedFormulationProduct.product.id && editFormData 
                      ? editFormData.components 
                      : selectedFormulationProduct.components
                    ).map((component, index) => {
                      // Safety check to ensure scaledQuantity is properly initialized
                      if (!scaledQuantity || !selectedFormulationProduct.product.base_composition_qty) {
                        const isEditMode = editingFormulationProduct === selectedFormulationProduct.product.id && editFormData;
                        const componentName = isEditMode ? component.name : component.chemical_name;
                        const componentQuantity = isEditMode ? component.quantity : component.quantity_required;
                        const componentUnit = component.unit;
                        const componentId = component.id || `new-${index}`;
                        
                        return (
                          <div key={componentId} className={styles.componentCard}>
                            <div className={styles.componentHeader}>
                              <span className={styles.componentName}>{componentName}</span>
                              <div className={styles.componentActions}>
                                <span className={styles.componentId}>#{componentId}</span>
                                {isEditMode && (
                                  <button
                                    className={styles.deleteComponentBtn}
                                    onClick={() => handleDeleteComponent(index)}
                                    title="Delete this component"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className={styles.componentQuantities}>
                              <div className={styles.quantityRow}>
                                <span className={styles.quantityLabel}>Original:</span>
                                <span className={styles.quantityValue}>
                                  {componentQuantity} {componentUnit}
                                </span>
                              </div>
                              <div className={styles.quantityRow}>
                                <span className={styles.quantityLabel}>Scaled:</span>
                                <span className={`${styles.quantityValue} ${styles.loading}`}>
                                  Loading...
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      const isEditMode = editingFormulationProduct === selectedFormulationProduct.product.id && editFormData;
                      const componentQuantity = isEditMode ? component.quantity : component.quantity_required;
                      const componentId = component.id || `new-${index}`;
                      
                      const scaleFactor = scaledQuantity / selectedFormulationProduct.product.base_composition_qty;
                      const scaledComponentQty = componentQuantity * scaleFactor;
                      
                      return (
                        <div key={componentId} className={styles.componentCard}>
                          <div className={styles.componentHeader}>
                            {editingFormulationProduct === selectedFormulationProduct.product.id ? (
                              <input
                                type="text"
                                value={editFormData?.components?.[index]?.name || component.chemical_name}
                                onChange={(e) => setEditFormData(prev => ({
                                  ...prev,
                                  components: prev.components.map((comp, i) => 
                                    i === index ? { ...comp, name: e.target.value } : comp
                                  )
                                }))}
                                className={styles.editInput}
                                placeholder="Chemical name"
                              />
                            ) : (
                              <span className={styles.componentName}>{component.chemical_name}</span>
                            )}
                            <div className={styles.componentActions}>
                              <span className={styles.componentId}>#{componentId}</span>
                              {editingFormulationProduct === selectedFormulationProduct.product.id && (
                                <button
                                  className={styles.deleteComponentBtn}
                                  onClick={() => handleDeleteComponent(index)}
                                  title="Delete this component"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className={styles.componentQuantities}>
                            <div className={styles.quantityRow}>
                              <span className={styles.quantityLabel}>Quantity:</span>
                              {editingFormulationProduct === selectedFormulationProduct.product.id ? (
                                <div className={styles.editQuantityGroup}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={componentQuantity}
                                    onChange={(e) => setEditFormData(prev => ({
                                      ...prev,
                                      components: prev.components.map((comp, i) => 
                                        i === index ? { ...comp, quantity: parseFloat(e.target.value) || 0 } : comp
                                      )
                                    }))}
                                    className={styles.editInput}
                                  />
                                  <span className={styles.unit}>{component.unit}</span>
                                </div>
                              ) : (
                                <span className={styles.quantityValue}>
                                  {componentQuantity} {component.unit}
                                </span>
                              )}
                            </div>
                            <div className={styles.quantityRow}>
                              <span className={styles.quantityLabel}>Scaled:</span>
                              <span className={`${styles.quantityValue} ${styles.scaled}`}>
                                {scaledComponentQty.toFixed(2)} {component.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className={styles.modalActions}>
                {editingFormulationProduct === selectedFormulationProduct.product.id ? (
                  <>
                    <button 
                      className={styles.saveBtn}
                      onClick={() => handleSaveFormulation()}
                      disabled={savingFormulation}
                      title="Save changes"
                    >
                      {savingFormulation ? (
                        <>
                          <RefreshCw size={18} className={styles.spinning} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button 
                      className={styles.cancelBtn}
                      onClick={() => handleCancelEdit()}
                      title="Cancel editing"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className={styles.editBtn}
                      onClick={() => handleEditFormulation(selectedFormulationProduct.product.id)}
                      title="Edit this formulation"
                    >
                      <Edit size={18} />
                      Edit Formulation
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => {
                        handleDeleteFormulationProduct(selectedFormulationProduct.product.id);
                        setShowFormulationDetails(false);
                      }}
                      title="Delete this formulation"
                    >
                      <Trash2 size={18} />
                      Delete Formulation
                    </button>
                  </>
                )}
                <button 
                  className={styles.closeBtn}
                  onClick={() => setShowFormulationDetails(false)}
                  title="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showExcelUpload && (
        <ExcelUploadModal
          onUpload={handleExcelUpload}
          onClose={() => setShowExcelUpload(false)}
          uploading={uploading}
        />
      )}
    </div>
  );
}

// Modal Components
function ChemicalFormModal({ chemical, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: chemical?.name || '',
    unit: chemical?.unit || 'g',
    available_qty: chemical?.available_qty || 0,
    threshold_qty: chemical?.threshold_qty || 0,
    is_manufactured: chemical?.is_manufactured || false
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{chemical ? 'Edit Chemical' : 'Add New Chemical'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Chemical Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
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
                step="0.01"
                value={formData.available_qty || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setFormData(prev => ({ ...prev, available_qty: isNaN(value) ? 0 : value }));
                }}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Threshold Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.threshold_qty || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setFormData(prev => ({ ...prev, threshold_qty: isNaN(value) ? 0 : value }));
                }}
                required
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.is_manufactured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_manufactured: e.target.checked }))}
              />
              This is a manufactured chemical
            </label>
          </div>
          
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              {chemical ? 'Update' : 'Create'} Chemical
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormulationFormModal({ formulation, chemicals, products, onSubmit, onClose }) {
  // Product data
  const [productData, setProductData] = useState({
    name: '',
    base_composition_qty: 0,
    unit: 'g'
  });
  
  // Component data for adding new components
  const [componentData, setComponentData] = useState({
    name: '',
    quantity: 0,
    unit: 'g'
  });
  
  // All added components
  const [components, setComponents] = useState([]);
  
  // Track if we're editing
  const [editingComponentIndex, setEditingComponentIndex] = useState(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate we have a product and at least one component
    if (!productData.name || components.length === 0) {
      alert('Please provide a product name and at least one component');
      return;
    }
    
    // Validate that component total matches base composition
    const componentTotal = calculateTotalQuantity();
    if (Math.abs(componentTotal - productData.base_composition_qty) > 0.01) {
      alert(`Component total (${componentTotal}) must match base composition quantity (${productData.base_composition_qty})`);
      return;
    }
    
    // Submit the complete formulation data
    onSubmit({
      product: productData,
      components: components
    });
  };
  
  const handleAddComponent = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event bubbling
    
    if (!componentData.name || componentData.quantity <= 0) {
      alert('Please provide chemical name and quantity');
      return;
    }
    
    if (editingComponentIndex !== null) {
      // Update existing component
      const updatedComponents = [...components];
      updatedComponents[editingComponentIndex] = { ...componentData };
      setComponents(updatedComponents);
      setEditingComponentIndex(null);
    } else {
      // Add new component
      setComponents(prev => [...prev, { ...componentData }]);
      
      // Auto-update base composition quantity if it's 0
      if (productData.base_composition_qty === 0) {
        const newTotal = calculateTotalQuantity() + componentData.quantity;
        setProductData(prev => ({ ...prev, base_composition_qty: newTotal }));
      }
    }
    
    // Reset component form
    setComponentData({ name: '', quantity: 0, unit: 'g' });
  };
  

  
  const handleEditComponent = (index) => {
    const component = components[index];
    setComponentData({ ...component });
    setEditingComponentIndex(index);
  };
  
  const handleDeleteComponent = (index) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
    if (editingComponentIndex === index) {
      setEditingComponentIndex(null);
      setComponentData({ name: '', quantity: 0, unit: 'g' });
    }
  };
  
  const handleCancelEdit = () => {
    setEditingComponentIndex(null);
    setComponentData({ name: '', quantity: 0, unit: 'g' });
  };
  
  const calculateTotalQuantity = () => {
    return components.reduce((total, comp) => total + comp.quantity, 0);
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '800px', maxHeight: '90vh' }}>
        <div className={styles.modalHeader}>
          <h3>{formulation ? 'Edit Formulation' : 'Create New Formulation'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Product Information */}
          <div className={styles.formSection}>
            <h4>📦 Product Information</h4>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Product Name *</label>
                <input
                  type="text"
                  value={productData.name}
                  onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., OSR16124, WRCD9374"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Base Composition Quantity *</label>
                <div className={styles.quantityInputGroup}>
                  <input
                    type="number"
                    step="0.01"
                    value={productData.base_composition_qty}
                    onChange={(e) => setProductData(prev => ({ ...prev, base_composition_qty: parseFloat(e.target.value) || 0 }))}
                    placeholder="Total quantity for 100% composition"
                    required
                  />
                  {components.length > 0 && (
                    <button
                      type="button"
                      className={styles.autoCalculateBtn}
                      onClick={() => setProductData(prev => ({ ...prev, base_composition_qty: calculateTotalQuantity() }))}
                      title="Auto-calculate from components"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Unit *</label>
                <select
                  value={productData.unit}
                  onChange={(e) => setProductData(prev => ({ ...prev, unit: e.target.value }))}
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="l">Liters (L)</option>
                  <option value="ml">Milliliters (mL)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Component Addition */}
          <div className={styles.formSection}>
            <h4>🧪 Add Component Chemical</h4>
            <p className={styles.helpText}>
              Add components one by one. The total quantity of all components should match the base composition quantity above.
            </p>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Chemical Name *</label>
                <input
                  type="text"
                  value={componentData.name}
                  onChange={(e) => setComponentData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., AP3, HP2, 2156"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  value={componentData.quantity}
                  onChange={(e) => setComponentData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  placeholder="Required quantity"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Unit *</label>
                <select
                  value={componentData.unit}
                  onChange={(e) => setComponentData(prev => ({ ...prev, unit: e.target.value }))}
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="l">Liters (L)</option>
                  <option value="ml">Milliliters (mL)</option>
                </select>
              </div>
            </div>
            
            <div className={styles.componentActions}>
              {editingComponentIndex !== null ? (
                <>
                  <button 
                    type="button" 
                    className={styles.updateBtn}
                    onClick={handleAddComponent}
                  >
                    Update Component
                  </button>
                  <button 
                    type="button" 
                    className={styles.cancelBtn}
                    onClick={handleCancelEdit}
                  >
                    Cancel Edit
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className={styles.addBtn}
                  onClick={handleAddComponent}
                >
                  + Add Component
                </button>
              )}
            </div>
          </div>
          
          {/* Components Table */}
          {components.length > 0 && (
            <div className={styles.formSection}>
              <h4>📋 Components Summary</h4>
              
              {/* Validation Message */}
              {Math.abs(calculateTotalQuantity() - productData.base_composition_qty) > 0.01 && (
                <div className={styles.validationMessage}>
                  ⚠️ Component total ({calculateTotalQuantity()}) does not match base composition ({productData.base_composition_qty})
                </div>
              )}
              
              <div className={styles.componentsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Chemical Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((component, index) => (
                      <tr key={index}>
                        <td>{component.name}</td>
                        <td>{component.quantity}</td>
                        <td>{component.unit}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => handleEditComponent(index)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteComponent(index)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total:</strong></td>
                      <td><strong>{calculateTotalQuantity()}</strong></td>
                      <td><strong>{productData.unit}</strong></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={!productData.name || components.length === 0 || Math.abs(calculateTotalQuantity() - productData.base_composition_qty) > 0.01}
            >
              Create Formulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExcelUploadModal({ onUpload, onClose, uploading }) {
  const [file, setFile] = useState(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.includes('spreadsheet')) {
      setFile(selectedFile);
    } else {
      alert('Please select a valid Excel file (.xlsx or .xls)');
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onUpload(file);
    }
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Upload Excel Formulation</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Select Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              required
            />
            <small>Supported formats: .xlsx, .xls</small>
          </div>
          
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload & Parse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
