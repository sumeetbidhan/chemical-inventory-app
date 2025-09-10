import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';
import {
  FlaskConical,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Beaker,
  TestTube,
  Microscope,
  Plus,
  Upload,
  FileSpreadsheet,
  X,
  Search
} from 'lucide-react';
import styles from './LabDashboard.module.scss';

import { API_BASE } from '../config';

export default function LabDashboard() {
  const { user, userInfo } = useAuth();
  
  // Core state
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  
  // OTP verification state
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [otpError, setOtpError] = useState('');
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  
  // Product building state
  const [showProductBuilder, setShowProductBuilder] = useState(false);
  const [buildingAssignment, setBuildingAssignment] = useState(null);
  const [progress, setProgress] = useState({});
  const [isBuilding, setIsBuilding] = useState(false);
  const [formulationComponents, setFormulationComponents] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Extension request state
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [requestingExtension, setRequestingExtension] = useState(false);
  
  // OTP extension state
  const [showExtensionOTPModal, setShowExtensionOTPModal] = useState(false);
  const [extensionOTPCode, setExtensionOTPCode] = useState('');
  const [verifyingExtensionOTP, setVerifyingExtensionOTP] = useState(false);
  const [extensionRequestId, setExtensionRequestId] = useState(null);
  const [extensionOTPError, setExtensionOTPError] = useState('');
  
  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'formulations'
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  
  // Formulation management state
  const [showFormulationForm, setShowFormulationForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [formulationFormData, setFormulationFormData] = useState({
    product_name: '',
    base_composition_qty: '',
    unit: 'g',
    components: []
  });
  const [submittingFormulation, setSubmittingFormulation] = useState(false);
  const [formulationError, setFormulationError] = useState('');
  
  // Excel upload state
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelEditData, setExcelEditData] = useState(null);
  const [editingProduct, setEditingProduct] = useState(false);
  const [excelValidationMsg, setExcelValidationMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  
  // Data for forms
  const [chemicals, setChemicals] = useState([]);
  const [chemicalProducts, setChemicalProducts] = useState([]);
  
  // Load data on component mount
  useEffect(() => {
    if (user && userInfo) {
      loadInitialData();
    }
  }, [user, userInfo]);
  
  // Timer effect for real-time updates
  useEffect(() => {
    if (buildingAssignment && buildingAssignment.time_remaining > 0) {
      setTimeRemaining(buildingAssignment.time_remaining);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute
      
      return () => clearInterval(timer);
    } else if (buildingAssignment) {
      setTimeRemaining(buildingAssignment.time_remaining || 0);
    }
  }, [buildingAssignment]);

  // Time expiry detection and extension prompt
  useEffect(() => {
    if (timeRemaining <= 0 && buildingAssignment && showProductBuilder) {
      // Time has expired, show extension prompt
      const shouldShowExtension = window.confirm(
        `Time has expired for assignment "${buildingAssignment.product_name}". Would you like to request a time extension?`
      );
      
      if (shouldShowExtension) {
        setSelectedAssignment(buildingAssignment);
        setExtensionReason('Time expired - requesting extension to complete work');
        setExtensionMinutes(60);
        setShowExtensionModal(true);
      } else {
        // Close the builder if user doesn't want extension
        setShowProductBuilder(false);
        setBuildingAssignment(null);
        setFormulationComponents([]);
        setProgress({});
        loadAssignments();
      }
    }
  }, [timeRemaining, buildingAssignment, showProductBuilder]);

  // Update time remaining when buildingAssignment changes
  useEffect(() => {
    if (buildingAssignment) {
      setTimeRemaining(buildingAssignment.time_remaining || 0);
    }
  }, [buildingAssignment?.time_remaining]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    if (user && userInfo) {
      const connectWebSocket = async () => {
        try {
          // Get fresh token
          const token = await user.getIdToken(true);
          localStorage.setItem('firebase_token', token);

          // Connect to WebSocket with fresh token
          await websocketService.connect(
            'lab', // team type
            userInfo.id.toString(), // user ID
            token,
            // onMessage
            (data) => {
              console.log('📨 Lab WebSocket message received:', data);
              handleWebSocketMessage(data);
            },
            // onError
            (error) => {
              console.error('❌ Lab WebSocket error:', error);
              setWsConnected(false);
            },
            // onClose
            (event) => {
              console.log('🔌 Lab WebSocket closed:', event.code, event.reason);
              setWsConnected(false);
            }
          );

          // Check connection status
          const checkConnection = () => {
            const status = websocketService.getConnectionStatus('lab', userInfo.id.toString());
            setWsConnected(status === 'connected');
          };

          // Check connection status periodically
          const interval = setInterval(checkConnection, 1000);
          checkConnection(); // Initial check

          return () => {
            clearInterval(interval);
            websocketService.disconnect('lab', userInfo.id.toString());
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
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial data for Lab Dashboard...');
      
      // Load all data in parallel
      const [assignmentsData, chemicalsData, productsData] = await Promise.all([
        loadAssignments(),
        loadChemicals(),
        loadChemicalProducts()
      ]);
      
      console.log('✅ Initial data loaded for Lab Dashboard');
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/my-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to load assignments: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Loaded lab assignments:', data);
      
      // Filter assignments for lab staff only
      const labAssignments = data.filter(assignment => 
        assignment.team_type === 'LAB' || 
        assignment.team_type === 'lab' ||
        assignment.team_type === 'LAB_STAFF' || 
        assignment.team_type === 'lab_staff'
      );
      
      console.log('Filtered lab assignments:', labAssignments);
      console.log('First assignment details:', labAssignments[0]);
      
      setAssignments(labAssignments);
      return labAssignments;
    } catch (err) {
      console.error('Error loading assignments:', err);
      throw err;
    }
  };

  const loadChemicals = async () => {
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/chemicals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load chemicals: ${response.statusText}`);
      }
      
      const data = await response.json();
      setChemicals(data);
      return data;
    } catch (err) {
      console.error('Error loading chemicals:', err);
      throw err;
    }
  };

  const loadChemicalProducts = async () => {
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load chemical products: ${response.statusText}`);
      }
      
      const data = await response.json();
      // The products endpoint returns {products: [...], total: ...}
      setChemicalProducts(data.products || data);
      return data.products || data;
    } catch (err) {
      console.error('Error loading chemical products:', err);
      throw err;
    }
  };

  // Load formulation components for an assignment
  const loadFormulationComponents = async (assignmentId) => {
    try {
      // Get fresh token from Firebase user
      let token = localStorage.getItem('firebase_token');
      
      // If we have a user object, get a fresh token
      if (user) {
        try {
          token = await user.getIdToken();
          localStorage.setItem('firebase_token', token);
        } catch (tokenError) {
          console.warn('Failed to refresh token:', tokenError);
        }
      }
      
      console.log('Loading formulation components for assignment:', assignmentId);
      console.log('API URL:', `${API_BASE}/assignments/${assignmentId}/formulation-components`);
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/formulation-components`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to load formulation components: ${response.statusText}`);
      }

      const components = await response.json();
      console.log('Loaded formulation components:', components);
      return components;
    } catch (err) {
      console.error('Error loading formulation components:', err);
      return [];
    }
  };
  
  const handleWebSocketMessage = (data) => {
    console.log('📨 Lab WebSocket message received:', data);
    
    switch (data.type) {
      case 'connection_established':
        console.log('✅ Lab WebSocket connection established');
        setWsConnected(true);
        break;
        
      case 'connection_info':
        console.log('ℹ️ Lab connection info:', data.message);
        setWsConnected(true);
        break;
        
      case 'pong':
        console.log('🏓 Lab pong received');
        break;
        
      case 'assignment_created':
        console.log('🆕 New assignment created');
        loadAssignments(); // Refresh assignments
        break;
        
      case 'assignment_updated':
        console.log('🔄 Assignment updated');
        loadAssignments(); // Refresh assignments
        break;
        
      case 'assignment_completed':
        console.log('✅ Assignment completed by', data.updated_by);
        loadAssignments(); // Refresh assignments
        break;
        
      case 'component_completed':
        console.log('🧪 Component completed by', data.completed_by);
        break;
        
      case 'help_requested':
        console.log('🆘 Help requested by', data.user_id, ':', data.message);
        break;
        
      case 'otp_expired':
        console.log('⏰ OTP expired');
        break;
        
      case 'timer_update':
        console.log('⏰ Timer update received:', data);
        // Update timer for the current building assignment
        if (buildingAssignment && data.assignment_id === buildingAssignment.id) {
          setTimeRemaining(data.time_remaining);
        }
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', data.message);
        break;
        
      default:
        console.log('❓ Unknown WebSocket message type:', data.type);
    }
  };
  
  const handleStartAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setOtpCode('');
    setOtpError('');
    setShowOTPModal(true);
  };
  
  const handleVerifyOTP = async () => {
    if (!selectedAssignment || !otpCode.trim()) {
      setOtpError('Please enter the OTP code');
      return;
    }
    
    try {
      setVerifyingOTP(true);
      setOtpError('');
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/start-formulation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          otp_code: otpCode.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to verify OTP');
      }
      
      const data = await response.json();
      console.log('OTP verified successfully:', data);
      
      // Close OTP modal and open product builder
      setShowOTPModal(false);
      setBuildingAssignment(selectedAssignment);
      setShowProductBuilder(true);
      
      // Load formulation components for this assignment
      console.log('About to load formulation components for assignment:', selectedAssignment.id);
      const components = await loadFormulationComponents(selectedAssignment.id);
      console.log('Received components:', components);
      setFormulationComponents(components);
      
      // Refresh assignments to get updated status
      loadAssignments();
      
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setOtpError(err.message);
    } finally {
      setVerifyingOTP(false);
    }
  };
  
  const handleUpdateProgress = async (componentId, status) => {
    if (!buildingAssignment) return;
    
    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/update-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: buildingAssignment.id,
          component_id: componentId,
          status: status
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update progress');
      }
      
      // Update local progress state
      setProgress(prev => ({
        ...prev,
        [componentId]: status
      }));
      
      // Refresh assignments
      loadAssignments();
      
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleCompleteComponent = async (component) => {
    if (!buildingAssignment) return;
    
    try {
      // Get fresh token from Firebase user
      let token = localStorage.getItem('firebase_token');
      
      if (user) {
        try {
          token = await user.getIdToken();
          localStorage.setItem('firebase_token', token);
        } catch (tokenError) {
          console.warn('Failed to refresh token:', tokenError);
        }
      }

      const response = await fetch(`${API_BASE}/assignments/${buildingAssignment.id}/complete-component`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          component_chemical_id: component.component_chemical_id,
          quantity_used: component.quantity_required
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete component');
      }
      
      const result = await response.json();
      console.log('Component completed:', result);
      
      // Send WebSocket notification
      websocketService.sendComponentCompleted('lab', userInfo.id.toString(), buildingAssignment.id, component.component_chemical_id);
      
      // Update the specific component in the state and calculate progress
      setFormulationComponents(prevComponents => {
        const updatedComponents = prevComponents.map(comp => 
          comp.component_chemical_id === component.component_chemical_id 
            ? { ...comp, completed: true, status: 'COMPLETED', completed_at: new Date().toISOString() }
            : comp
        );
        
        // Update the building assignment progress with the updated components
        const completedCount = updatedComponents.filter(c => c.completed || c.status === 'COMPLETED').length;
        setBuildingAssignment(prev => ({
          ...prev,
          progress_percentage: Math.round((completedCount / updatedComponents.length) * 100)
        }));
        
        return updatedComponents;
      });
      
    } catch (err) {
      console.error('Error completing component:', err);
      alert(`Error: ${err.message}`);
    }
  };
  
  const handleCompleteAssignment = async () => {
    if (!buildingAssignment) return;
    
    try {
      console.log('Completing assignment:', buildingAssignment.id);
      
      // Check if all components are completed
      const allCompleted = formulationComponents.every(comp => comp.completed || comp.status === 'COMPLETED');
      if (!allCompleted) {
        alert('Please complete all components before finishing the assignment.');
        return;
      }
      
      // Get fresh token from Firebase user
      let token = localStorage.getItem('firebase_token');
      
      if (user) {
        try {
          token = await user.getIdToken();
          localStorage.setItem('firebase_token', token);
        } catch (tokenError) {
          console.warn('Failed to refresh token:', tokenError);
        }
      }

      const response = await fetch(`${API_BASE}/assignments/complete-assignment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: buildingAssignment.id
        })
      });
      
      console.log('Complete assignment response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Complete assignment error:', errorData);
        
        // Check if assignment is already completed
        if (response.status === 400 && errorData.detail && errorData.detail.includes('already completed')) {
          alert('This assignment has already been completed. Closing the modal.');
          setShowProductBuilder(false);
          setBuildingAssignment(null);
          setProgress({});
          loadAssignments();
          return;
        }
        
        throw new Error(errorData.detail || `Failed to complete assignment: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Assignment completed successfully:', result);
      
      // Send WebSocket notification
      websocketService.sendAssignmentCompleted('lab', userInfo.id.toString(), buildingAssignment.id);
      
      // Close product builder and refresh assignments
      setShowProductBuilder(false);
      setBuildingAssignment(null);
      setProgress({});
      loadAssignments();
      
      alert('Lab work completed successfully!');
      
    } catch (err) {
      console.error('Error completing assignment:', err);
      alert(`Error completing assignment: ${err.message}`);
    }
  };
  
  const handleRequestExtension = (assignment) => {
    setSelectedAssignment(assignment);
    setExtensionReason('');
    setExtensionMinutes(60);
    setShowExtensionModal(true);
  };

  const handleRequestExtensionWithOTP = async () => {
    if (!selectedAssignment || !extensionReason.trim()) {
      return;
    }
    
    try {
      setRequestingExtension(true);
      setExtensionOTPError('');
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/request-extension-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          reason: extensionReason.trim(),
          requested_extension_minutes: extensionMinutes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to request extension');
      }
      
      const result = await response.json();
      
      // Close extension modal and show OTP modal
      setShowExtensionModal(false);
      setExtensionRequestId(result.extension_request_id);
      setExtensionOTPCode('');
      setShowExtensionOTPModal(true);
      
    } catch (err) {
      console.error('Error requesting extension with OTP:', err);
      setExtensionOTPError(err.message);
    } finally {
      setRequestingExtension(false);
    }
  };

  const handleVerifyExtensionOTP = async () => {
    if (!extensionOTPCode.trim() || !extensionRequestId) {
      setExtensionOTPError('Please enter the OTP code');
      return;
    }
    
    try {
      setVerifyingExtensionOTP(true);
      setExtensionOTPError('');
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/verify-extension-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extension_request_id: extensionRequestId,
          otp_code: extensionOTPCode.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid OTP code');
      }
      
      // Close OTP modal and refresh assignments
      setShowExtensionOTPModal(false);
      setSelectedAssignment(null);
      setExtensionRequestId(null);
      setExtensionOTPCode('');
      loadAssignments();
      
      alert('Extension request submitted successfully!');
      
    } catch (err) {
      console.error('Error verifying extension OTP:', err);
      setExtensionOTPError(err.message);
    } finally {
      setVerifyingExtensionOTP(false);
    }
  };
  
  const handleSubmitExtensionRequest = async () => {
    if (!selectedAssignment || !extensionReason.trim()) {
      return;
    }
    
    try {
      setRequestingExtension(true);
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/request-extension`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          reason: extensionReason.trim(),
          requested_extension_minutes: extensionMinutes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to request extension');
      }
      
      // Close modal and refresh assignments
      setShowExtensionModal(false);
      setSelectedAssignment(null);
      loadAssignments();
      
    } catch (err) {
      console.error('Error requesting extension:', err);
    } finally {
      setRequestingExtension(false);
    }
  };
  
  // Filter assignments based on status
  const getFilteredAssignments = () => {
    return assignments.filter(assignment => 
      assignment.status === 'ASSIGNED' || 
      assignment.status === 'IN_PROGRESS'
    );
  };
  
  // Get paginated assignments
  const getPaginatedAssignments = () => {
    const filtered = getFilteredAssignments();
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filtered.slice(startIndex, endIndex);
  };
  
  // Get total pages
  const getTotalPages = () => {
    const filtered = getFilteredAssignments();
    return Math.ceil(filtered.length / perPage);
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return <Clock size={16} color="var(--warning-color)" />;
      case 'IN_PROGRESS':
        return <Play size={16} color="var(--info-color)" />;
      case 'COMPLETED':
        return <CheckCircle size={16} color="var(--success-color)" />;
      case 'EXPIRED':
        return <XCircle size={16} color="var(--error-color)" />;
      default:
        return <Clock size={16} color="var(--text-muted)" />;
    }
  };
  
  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return 'Ready to Start';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'EXPIRED':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };
  
  // Format time remaining
  const formatTimeRemaining = (timeRemainingMinutes) => {
    if (!timeRemainingMinutes || timeRemainingMinutes <= 0) return 'No time limit';
    
    const hours = Math.floor(timeRemainingMinutes / 60);
    const minutes = timeRemainingMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Formulation management functions
  const handleFormulationFormChange = (field, value) => {
    setFormulationFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addFormulationComponent = () => {
    setFormulationFormData(prev => ({
      ...prev,
      components: [...prev.components, { code: '', quantity: '', unit: 'g' }]
    }));
  };

  const updateFormulationComponent = (index, field, value) => {
    setFormulationFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const removeFormulationComponent = (index) => {
    setFormulationFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleCreateFormulation = async (e) => {
    e.preventDefault();
    
    if (!formulationFormData.product_name || !formulationFormData.base_composition_qty || formulationFormData.components.length === 0) {
      setFormulationError('Please fill in all required fields');
      return;
    }

    try {
      setSubmittingFormulation(true);
      setFormulationError(null);

      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/formulations/create-lab`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formulationFormData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create formulation: ${response.status}`);
      }

      const newFormulation = await response.json();
      console.log('✅ Formulation created by lab staff:', newFormulation);

      // Reset form
      setFormulationFormData({
        product_name: '',
        base_composition_qty: '',
        unit: 'g',
        components: []
      });
      setShowFormulationForm(false);

      // Show success message
      alert('Formulation created successfully! It is now available in the system.');

    } catch (err) {
      console.error('Error creating formulation:', err);
      setFormulationError(err.message);
    } finally {
      setSubmittingFormulation(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    setUploading(true);
    setFormulationError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/excel/upload-formulation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to preview Excel: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Excel preview by lab staff:', result);

      // Set preview data and show modal
      setExcelPreview(result.parsed_data);
      setExcelEditData(result.parsed_data);
      setShowExcelPreview(true);

    } catch (err) {
      console.error('Error previewing Excel:', err);
      setFormulationError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditProduct = () => {
    setEditingProduct(true);
  };

  const handleSaveEdit = () => {
    setEditingProduct(false);
  };

  const handleCancelEdit = () => {
    // Reset to original data
    setExcelEditData(excelPreview);
    setEditingProduct(false);
  };

  const handleProductNameChange = (e) => {
    setExcelEditData(prev => ({
      ...prev,
      product_name: e.target.value
    }));
  };

  const handleBaseQuantityChange = (e) => {
    setExcelEditData(prev => ({
      ...prev,
      base_composition_qty: parseFloat(e.target.value) || 0
    }));
  };

  const handleComponentChange = (index, field, value) => {
    setExcelEditData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const handleAddComponent = () => {
    setExcelEditData(prev => ({
      ...prev,
      components: [...prev.components, { code: '', quantity: 0, unit: 'g' }]
    }));
  };

  const handleRemoveComponent = (index) => {
    setExcelEditData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleConfirmExcel = async () => {
    if (!excelEditData) return;

    setUploading(true);
    setFormulationError('');

    try {
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/excel/approve-formulation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(excelEditData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to confirm Excel: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Excel confirmed by lab staff:', result);

      // Show success message
      alert('Excel uploaded successfully! Formulations are now available in the system.');

      // Close preview and reset
      setShowExcelPreview(false);
      setExcelPreview(null);
      setExcelEditData(null);
      setExcelFile(null);
      setEditingProduct(false);

    } catch (err) {
      console.error('Error confirming Excel:', err);
      setFormulationError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingState}>
          <RefreshCw size={32} className={styles.spinning} />
          <p>Loading your lab assignments...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorState}>
          <AlertTriangle size={32} color="var(--error-color)" />
          <h3>Error Loading Assignments</h3>
          <p>{error}</p>
          <button 
            className={styles.retryBtn}
            onClick={loadAssignments}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  const filteredAssignments = getFilteredAssignments();
  const paginatedAssignments = getPaginatedAssignments();
  const totalPages = getTotalPages();
  
  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <h2>
            <span className={styles.headerIcon}>
              <Beaker size={28} color="var(--accent-color)" />
            </span>
            Lab Team Dashboard
          </h2>
          <div className={styles.headerInfo}>
            <div className={styles.connectionStatus}>
              <div className={`${styles.statusDot} ${wsConnected ? styles.connected : styles.disconnected}`} />
              <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button 
              className={styles.refreshBtn}
              onClick={loadAssignments}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            </button>
          </div>
        </div>
        <div className={styles.teamInfo}>
          <div className={styles.teamBadge}>
            <TestTube size={16} />
            <span>Lab Staff - Small Batch Specialist</span>
          </div>
          <p>You handle chemical products with quantities less than 2kg for precise laboratory work.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${activeTab === 'assignments' ? styles.active : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <FlaskConical size={20} />
          My Assignments
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'formulations' ? styles.active : ''}`}
          onClick={() => setActiveTab('formulations')}
        >
          <FileSpreadsheet size={20} />
          Formulation Management
        </button>
      </div>
      
      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className={styles.assignmentsSection}>
        <div className={styles.sectionHeader}>
          <h3>Your Lab Assignments</h3>
          <div className={styles.assignmentCount}>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {filteredAssignments.length === 0 ? (
          <div className={styles.noAssignments}>
            <Microscope size={48} color="var(--text-muted)" />
            <h4>No Active Lab Assignments</h4>
            <p>You don't have any active lab assignments at the moment. Check back later or contact your administrator.</p>
          </div>
        ) : (
          <>
            {/* Assignments Table */}
            <div className={styles.assignmentsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Time Remaining</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.map(assignment => (
                    <tr key={assignment.id}>
                      <td>
                        <div className={styles.productInfo}>
                          <strong>{assignment.product_name || 'Unknown Product'}</strong>
                          <small>ID: {assignment.product_id}</small>
                        </div>
                      </td>
                      <td>
                        <div className={styles.quantityInfo}>
                          <span className={styles.quantity}>{assignment.quantity_requested}</span>
                          <span className={styles.unit}>{assignment.unit}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.statusInfo}>
                          {getStatusIcon(assignment.status)}
                          <span>{getStatusText(assignment.status)}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.timeInfo}>
                          {formatTimeRemaining(assignment.time_remaining)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.progressInfo}>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{ width: `${assignment.progress_percentage || 0}%` }}
                            />
                          </div>
                          <span className={styles.progressText}>
                            {assignment.progress_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {assignment.status === 'ASSIGNED' && (
                            <button
                              className={styles.startBtn}
                              onClick={() => handleStartAssignment(assignment)}
                            >
                              <Play size={16} />
                              Start
                            </button>
                          )}
                          {assignment.status === 'IN_PROGRESS' && (
                            <>
                              <button
                                className={styles.continueBtn}
                                onClick={async () => {
                                  setBuildingAssignment(assignment);
                                  setShowProductBuilder(true);
                                  
                                  // Load formulation components for this assignment
                                  console.log('Loading components for continuing assignment:', assignment.id);
                                  const components = await loadFormulationComponents(assignment.id);
                                  console.log('Received components:', components);
                                  setFormulationComponents(components);
                                }}
                              >
                                <Play size={16} />
                                Continue
                              </button>
                              <button
                                className={styles.extensionBtn}
                                onClick={() => handleRequestExtension(assignment)}
                              >
                                <Clock size={16} />
                                Request Extension
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, filteredAssignments.length)} of {filteredAssignments.length} assignments
                </div>
                <div className={styles.paginationControls}>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className={styles.pageNumbers}>
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            className={`${styles.pageBtn} ${currentPage === i ? styles.activePage : ''}`}
                            onClick={() => setCurrentPage(i)}
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
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      )}

      {/* Formulations Tab */}
      {activeTab === 'formulations' && (
        <div className={styles.formulationsSection}>
          <div className={styles.sectionHeader}>
            <h3>Formulation Management</h3>
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
                onClick={() => document.getElementById('excelUpload').click()}
                disabled={uploading}
              >
                <Upload size={20} />
                {uploading ? 'Uploading...' : 'Upload Excel'}
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

          {/* Hidden file input for Excel upload */}
          <input
            id="excelUpload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            style={{ display: 'none' }}
          />

          {/* Formulation Form Modal */}
          {showFormulationForm && (
            <div className={styles.modalOverlay}>
              <div className={styles.formulationModal}>
                <div className={styles.modalHeader}>
                  <h3>
                    <FileSpreadsheet size={20} />
                    Add New Formulation
                  </h3>
                  <button 
                    className={styles.closeBtn}
                    onClick={() => setShowFormulationForm(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className={styles.modalContent}>
                  <form onSubmit={handleCreateFormulation}>
                    <div className={styles.formGroup}>
                      <label htmlFor="product_name">Product Name *</label>
                      <input
                        type="text"
                        id="product_name"
                        value={formulationFormData.product_name}
                        onChange={(e) => handleFormulationFormChange('product_name', e.target.value)}
                        className={styles.formInput}
                        placeholder="Enter product name"
                        required
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="base_composition_qty">Base Composition Quantity *</label>
                        <input
                          type="number"
                          id="base_composition_qty"
                          step="0.01"
                          min="0"
                          value={formulationFormData.base_composition_qty}
                          onChange={(e) => handleFormulationFormChange('base_composition_qty', e.target.value)}
                          className={styles.formInput}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="unit">Unit</label>
                        <select
                          id="unit"
                          value={formulationFormData.unit}
                          onChange={(e) => handleFormulationFormChange('unit', e.target.value)}
                          className={styles.formSelect}
                        >
                          <option value="g">Grams (g)</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="ml">Milliliters (ml)</option>
                          <option value="l">Liters (l)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.componentsSection}>
                      <div className={styles.componentsHeader}>
                        <h4>Component Chemicals *</h4>
                        <button
                          type="button"
                          onClick={addFormulationComponent}
                          className={styles.addComponentBtn}
                        >
                          <Plus size={16} />
                          Add Component
                        </button>
                      </div>

                      {formulationFormData.components.map((component, index) => (
                        <div key={index} className={styles.componentRow}>
                          <div className={styles.formGroup}>
                            <label>Chemical Code</label>
                            <input
                              type="text"
                              value={component.code}
                              onChange={(e) => updateFormulationComponent(index, 'code', e.target.value)}
                              className={styles.formInput}
                              placeholder="e.g., CHEM001"
                              required
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Quantity</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={component.quantity}
                              onChange={(e) => updateFormulationComponent(index, 'quantity', e.target.value)}
                              className={styles.formInput}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Unit</label>
                            <select
                              value={component.unit}
                              onChange={(e) => updateFormulationComponent(index, 'unit', e.target.value)}
                              className={styles.formSelect}
                            >
                              <option value="g">Grams (g)</option>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="ml">Milliliters (ml)</option>
                              <option value="l">Liters (l)</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFormulationComponent(index)}
                            className={styles.removeBtn}
                            title="Remove component"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}

                      {formulationFormData.components.length === 0 && (
                        <div className={styles.noComponents}>
                          <p>No components added yet. Click "Add Component" to start.</p>
                        </div>
                      )}
                    </div>

                    {formulationError && (
                      <div className={styles.errorMessage}>
                        {formulationError}
                      </div>
                    )}

                    <div className={styles.modalFooter}>
                      <button
                        type="button"
                        onClick={() => setShowFormulationForm(false)}
                        className={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingFormulation || formulationFormData.components.length === 0}
                        className={styles.submitBtn}
                      >
                        {submittingFormulation ? 'Creating...' : 'Create Formulation'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Excel Preview Modal */}
          {showExcelPreview && excelEditData && (
            <div className={styles.modalOverlay}>
              <div className={styles.excelPreviewModal}>
                <div className={styles.modalHeader}>
                  <h3>
                    <FileSpreadsheet size={20} />
                    Excel Preview - Review & Confirm
                  </h3>
                  <button 
                    className={styles.closeBtn}
                    onClick={() => {
                      setShowExcelPreview(false);
                      setExcelPreview(null);
                      setExcelEditData(null);
                      setExcelFile(null);
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div className={styles.modalContent}>
                  <div className={styles.previewSummary}>
                    <h4>Excel File Summary</h4>
                    <div className={styles.summaryStats}>
                      <div className={styles.statItem}>
                        <strong>Product:</strong> {excelEditData.product_name}
                      </div>
                      <div className={styles.statItem}>
                        <strong>Components:</strong> {excelEditData.components.length}
                      </div>
                      <div className={styles.statItem}>
                        <strong>Format:</strong> {excelEditData.format}
                      </div>
                    </div>
                    {!editingProduct && (
                      <button 
                        className={styles.editBtn}
                        onClick={handleEditProduct}
                      >
                        ✏️ Edit Data
                      </button>
                    )}
                  </div>

                  <div className={styles.productsList}>
                    <h4>Product to be Created</h4>
                    <div className={styles.productPreview}>
                      <div className={styles.productHeader}>
                        {editingProduct ? (
                          <div className={styles.editProductName}>
                            <input
                              type="text"
                              value={excelEditData.product_name}
                              onChange={handleProductNameChange}
                              className={styles.editInput}
                              placeholder="Product Name"
                            />
                          </div>
                        ) : (
                          <h5>{excelEditData.product_name}</h5>
                        )}
                        {editingProduct ? (
                          <div className={styles.editQuantity}>
                            <input
                              type="number"
                              value={excelEditData.base_composition_qty}
                              onChange={handleBaseQuantityChange}
                              className={styles.editInput}
                              placeholder="Quantity"
                              step="0.01"
                            />
                            <span className={styles.unitLabel}>{excelEditData.unit}</span>
                          </div>
                        ) : (
                          <span className={styles.productQuantity}>
                            {excelEditData.base_composition_qty} {excelEditData.unit}
                          </span>
                        )}
                      </div>
                      <div className={styles.componentsList}>
                        <div className={styles.componentsHeader}>
                          <h6>Components ({excelEditData.components.length}):</h6>
                          {editingProduct && (
                            <button 
                              className={styles.addComponentBtn}
                              onClick={handleAddComponent}
                            >
                              + Add Component
                            </button>
                          )}
                        </div>
                        <div className={styles.componentsGrid}>
                          {excelEditData.components.map((component, compIndex) => (
                            <div key={compIndex} className={styles.componentPreview}>
                              {editingProduct ? (
                                <div className={styles.editComponent}>
                                  <input
                                    type="text"
                                    value={component.code}
                                    onChange={(e) => handleComponentChange(compIndex, 'code', e.target.value)}
                                    className={styles.editInput}
                                    placeholder="Chemical Code"
                                  />
                                  <input
                                    type="number"
                                    value={component.quantity}
                                    onChange={(e) => handleComponentChange(compIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                    className={styles.editInput}
                                    placeholder="Quantity"
                                    step="0.01"
                                  />
                                  <select
                                    value={component.unit}
                                    onChange={(e) => handleComponentChange(compIndex, 'unit', e.target.value)}
                                    className={styles.editSelect}
                                  >
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                    <option value="ml">ml</option>
                                    <option value="l">l</option>
                                    <option value="mg">mg</option>
                                  </select>
                                  <button 
                                    className={styles.removeBtn}
                                    onClick={() => handleRemoveComponent(compIndex)}
                                    title="Remove Component"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className={styles.componentCode}>{component.code}</span>
                                  <span className={styles.componentQuantity}>
                                    {component.quantity} {component.unit}
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {formulationError && (
                    <div className={styles.errorMessage}>
                      {formulationError}
                    </div>
                  )}

                  <div className={styles.modalFooter}>
                    {editingProduct ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className={styles.cancelBtn}
                        >
                          Cancel Edit
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className={styles.saveBtn}
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowExcelPreview(false);
                            setExcelPreview(null);
                            setExcelEditData(null);
                            setExcelFile(null);
                            setEditingProduct(false);
                          }}
                          className={styles.cancelBtn}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmExcel}
                          disabled={uploading}
                          className={styles.submitBtn}
                        >
                          {uploading ? 'Creating...' : 'Confirm & Create Formulations'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulation Management Info */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <FileSpreadsheet size={24} />
              <h4>Formulation Management</h4>
            </div>
            <div className={styles.infoContent}>
              <p>As a lab staff member, you can create new formulations and upload Excel files with formulation data.</p>
              <ul>
                <li><strong>Add Formulation:</strong> Create a new formulation manually with component chemicals</li>
                <li><strong>Upload Excel:</strong> Upload an Excel file with multiple formulations at once</li>
                <li><strong>Immediate Availability:</strong> Formulations you create are immediately available in the system</li>
                <li><strong>Admin Visibility:</strong> All formulations appear in the admin's formulation management</li>
                <li><strong>Lab Focus:</strong> Formulations are optimized for small batch laboratory work</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Shield size={20} />
                Verify OTP to Start Lab Assignment
              </h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowOTPModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.assignmentInfo}>
                <h4>{selectedAssignment?.product_name}</h4>
                <p>Quantity: {selectedAssignment?.quantity_requested} {selectedAssignment?.unit}</p>
                <p>Time Allotted: {selectedAssignment?.time_allotted_minutes} minutes</p>
                <p className={styles.labNote}>This is a small batch assignment for precise laboratory work.</p>
              </div>
              
              <div className={styles.otpInput}>
                <label htmlFor="otpCode">Enter OTP Code:</label>
                <input
                  id="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP code"
                  maxLength={6}
                  className={otpError ? styles.error : ''}
                />
                {otpError && (
                  <div className={styles.errorMessage}>
                    {otpError}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowOTPModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.verifyBtn}
                onClick={handleVerifyOTP}
                disabled={verifyingOTP || !otpCode.trim()}
              >
                {verifyingOTP ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Verify & Start
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Builder Modal */}
      {showProductBuilder && buildingAssignment && (
        <div className={styles.modalOverlay}>
          <div className={styles.productBuilderModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Beaker size={20} />
                Lab Work: {buildingAssignment.product_name}
              </h3>
              <button 
                className={styles.closeBtn}
                onClick={() => {
                  setShowProductBuilder(false);
                  setBuildingAssignment(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.builderInfo}>
                <div className={styles.infoItem}>
                  <strong>Quantity:</strong> {buildingAssignment.quantity_requested} {buildingAssignment.unit}
                </div>
                <div className={styles.infoItem}>
                  <strong>Time Remaining:</strong> {formatTimeRemaining(timeRemaining || buildingAssignment.time_remaining)}
                </div>
                <div className={styles.infoItem}>
                  <strong>Progress:</strong> {buildingAssignment.progress_percentage || 0}%
                </div>
                <div className={styles.infoItem}>
                  <strong>Type:</strong> Small Batch Lab Work
                </div>
              </div>
              
              {/* Product Building Interface */}
              <div className={styles.builderInterface}>
                <h4>Lab Formulation Components</h4>
                
                {/* Components Header - Outside the grid */}
                {formulationComponents.length > 0 && (
                  <div className={styles.componentsHeader}>
                    <h5>Formulation Components ({formulationComponents.length})</h5>
                    <div className={styles.progressSummary}>
                      <span>Progress: {formulationComponents.filter(c => c.completed || c.status === 'COMPLETED').length}/{formulationComponents.length} completed</span>
                    </div>
                  </div>
                )}
                
                <div className={styles.componentsGrid}>
                  {console.log('Rendering components list. formulationComponents:', formulationComponents)}
                  {formulationComponents.length > 0 ? (
                    formulationComponents.map((component, index) => {
                        const isCompleted = component.completed || component.status === 'COMPLETED';
                        const isPending = component.status === 'PENDING';
                        const chemicalName = component.chemical_name || component.component_name || `Chemical ID ${component.component_chemical_id}`;
                        const quantity = component.scaled_quantity || component.quantity_required || 0;
                        const unit = component.unit || 'g';
                        
                        return (
                          <div key={component.id || index} className={styles.componentCard}>
                            <div className={styles.componentHeader}>
                              <h5 className={styles.componentName}>{chemicalName}</h5>
                              <div className={styles.componentQuantity}>
                                {quantity.toFixed(2)} {unit}
                              </div>
                              {isCompleted && (
                                <span className={styles.completedBadge}>✓ Completed</span>
                              )}
                              {isPending && (
                                <span className={styles.pendingBadge}>⏳ Pending</span>
                              )}
                            </div>
                            <div className={styles.componentStatus}>
                              {!isCompleted ? (
                                <button 
                                  className={styles.completeBtn}
                                  onClick={() => handleCompleteComponent(component)}
                                >
                                  <CheckCircle size={16} />
                                  Complete
                                </button>
                              ) : (
                                <div className={styles.completedInfo}>
                                  <span className={styles.completedText}>
                                    ✓ Completed
                                  </span>
                                  {component.completed_at && (
                                    <small className={styles.completedTime}>
                                      at {new Date(component.completed_at).toLocaleTimeString()}
                                    </small>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className={styles.noComponents}>
                      <p>No formulation components found for this product.</p>
                      <p>Please check if the product has been properly configured with formulation components.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => {
                  setShowProductBuilder(false);
                  setBuildingAssignment(null);
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.completeBtn}
                onClick={handleCompleteAssignment}
                disabled={!formulationComponents.every(comp => comp.completed || comp.status === 'COMPLETED')}
              >
                <CheckCircle size={16} />
                {formulationComponents.every(comp => comp.completed || comp.status === 'COMPLETED') 
                  ? 'Complete Lab Work' 
                  : 'Complete All Components First'
                }
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Extension Request Modal */}
      {showExtensionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Clock size={20} />
                Request Time Extension
              </h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowExtensionModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.assignmentInfo}>
                <h4>{selectedAssignment?.product_name}</h4>
                <p>Quantity: {selectedAssignment?.quantity_requested} {selectedAssignment?.unit}</p>
                <p>Current Time Remaining: {formatTimeRemaining(selectedAssignment?.time_remaining)}</p>
                <p className={styles.labNote}>Request additional time to complete this lab assignment.</p>
              </div>
              
              <div className={styles.extensionInput}>
                <label htmlFor="extensionMinutes">Additional Time (minutes):</label>
                <input
                  id="extensionMinutes"
                  type="number"
                  value={extensionMinutes}
                  onChange={(e) => setExtensionMinutes(parseInt(e.target.value) || 60)}
                  min="15"
                  max="480"
                  step="15"
                />
              </div>
              
              <div className={styles.extensionInput}>
                <label htmlFor="extensionReason">Reason for Extension:</label>
                <textarea
                  id="extensionReason"
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Please explain why you need additional time..."
                  rows={3}
                  required
                />
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowExtensionModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.verifyBtn}
                onClick={handleRequestExtensionWithOTP}
                disabled={requestingExtension || !extensionReason.trim()}
              >
                {requestingExtension ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Clock size={16} />
                    Request Extension with OTP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Extension OTP Verification Modal */}
      {showExtensionOTPModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Shield size={20} />
                Verify Extension Request
              </h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowExtensionOTPModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.assignmentInfo}>
                <h4>{selectedAssignment?.product_name}</h4>
                <p>Quantity: {selectedAssignment?.quantity_requested} {selectedAssignment?.unit}</p>
                <p className={styles.labNote}>Please enter the OTP sent to the admin's phone number to verify your extension request.</p>
              </div>
              
              <div className={styles.otpInput}>
                <label htmlFor="extensionOTPCode">Enter OTP Code:</label>
                <input
                  id="extensionOTPCode"
                  type="text"
                  value={extensionOTPCode}
                  onChange={(e) => setExtensionOTPCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
                {extensionOTPError && (
                  <div className={styles.errorMessage}>
                    {extensionOTPError}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowExtensionOTPModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.verifyBtn}
                onClick={handleVerifyExtensionOTP}
                disabled={verifyingExtensionOTP || !extensionOTPCode.trim()}
              >
                {verifyingExtensionOTP ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Verify Extension
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
