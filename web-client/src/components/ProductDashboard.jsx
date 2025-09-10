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
  Factory,
  Package,
  Truck
} from 'lucide-react';
import styles from './ProductDashboard.module.scss';

import { API_BASE } from '../config';

export default function ProductDashboard() {
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
  const [formulationComponents, setFormulationComponents] = useState([]);
  const [progress, setProgress] = useState({});
  const [isBuilding, setIsBuilding] = useState(false);
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
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  
  // Load assignments on component mount
  useEffect(() => {
    if (user && userInfo) {
      loadAssignments();
    }
  }, [user, userInfo]);

  // Timer effect for real-time updates
  useEffect(() => {
    if (buildingAssignment && buildingAssignment.time_remaining > 0) {
      setTimeRemaining(buildingAssignment.time_remaining);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            clearInterval(timer);
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
            'product', // team type
            userInfo.id.toString(), // user ID
            token,
            // onMessage
            (data) => {
              console.log('📨 WebSocket message received:', data);
              handleWebSocketMessage(data);
            },
            // onError
            (error) => {
              console.error('❌ WebSocket error:', error);
              setWsConnected(false);
            },
            // onClose
            (event) => {
              console.log('🔌 WebSocket closed:', event.code, event.reason);
              setWsConnected(false);
            }
          );

          // Check connection status
          const checkConnection = () => {
            const status = websocketService.getConnectionStatus('product', userInfo.id.toString());
            setWsConnected(status === 'connected');
          };

          // Check connection status periodically
          const interval = setInterval(checkConnection, 1000);
          checkConnection(); // Initial check

          return () => {
            clearInterval(interval);
            websocketService.disconnect('product', userInfo.id.toString());
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
  
  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('firebase_token');
      console.log('Loading assignments for user:', {
        userInfo: userInfo,
        token: token ? `${token.substring(0, 20)}...` : 'No token',
        apiUrl: `${API_BASE}/assignments/my-assignments`
      });
      
      const response = await fetch(`${API_BASE}/assignments/my-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
        console.error('Full error response:', errorData);
        throw new Error(errorData.detail || errorData.message || `Failed to load assignments: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Loaded product assignments:', data);
      
      // Filter assignments for product team only
      const productAssignments = data.filter(assignment => 
        assignment.team_type === 'PRODUCT' || 
        assignment.team_type === 'product' ||
        assignment.team_type === 'PRODUCT_TEAM' || 
        assignment.team_type === 'product_team'
      );
      
      setAssignments(productAssignments);
      
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
    console.log('📨 WebSocket message received:', data);
    
    switch (data.type) {
      case 'connection_established':
        console.log('✅ WebSocket connection established');
        setWsConnected(true);
        break;
        
      case 'connection_info':
        console.log('ℹ️ Connection info:', data.message);
        setWsConnected(true);
        break;
        
      case 'pong':
        console.log('🏓 Pong received');
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
        if (buildingAssignment && data.assignment_id === buildingAssignment.id) {
          loadFormulationComponents(); // Refresh components
        }
        break;
        
      case 'timer_update':
        console.log('⏰ Timer update received:', data);
        // Update timer for the current building assignment
        if (buildingAssignment && data.assignment_id === buildingAssignment.id) {
          setTimeRemaining(data.time_remaining);
        }
        break;
        
      case 'assignment_expired':
        console.log('⏰ Assignment expired:', data.assignment_id);
        // Handle assignment expiration
        if (buildingAssignment && data.assignment_id === buildingAssignment.id) {
          setTimeRemaining(0);
          // Close product builder and show expiration message
          setShowProductBuilder(false);
          setBuildingAssignment(null);
        }
        loadAssignments();
        break;
        
      case 'help_requested':
        console.log('🆘 Help requested by', data.user_id, ':', data.message);
        // You could show a notification here
        break;
        
      case 'otp_expired':
        console.log('⏰ OTP expired');
        // Show notification for expired OTP
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', data.message);
        break;
        
      default:
        console.log('❓ Unknown WebSocket message type:', data.type);
    }
  };
  
  const handleStartAssignment = (assignment) => {
    console.log('Starting assignment:', assignment);
    console.log('Assignment status:', assignment.status);
    console.log('Assignment product name:', assignment.product_name);
    
    setSelectedAssignment(assignment);
    setOtpCode('');
    setOtpError('');
    
    // Check if assignment is already in progress
    if (assignment.status === 'IN_PROGRESS') {
      // Assignment is already started, go directly to product builder
      setBuildingAssignment(assignment);
      setShowProductBuilder(true);
      
      // Load formulation components for this assignment
      loadFormulationComponents(assignment.id).then(components => {
        console.log('Received components:', components);
        setFormulationComponents(components);
      });
    } else if (assignment.status === 'ASSIGNED') {
      // Assignment needs OTP verification
      setShowOTPModal(true);
      console.log('OTP modal should be visible now');
    } else {
      // Assignment is completed or expired
      console.log('Assignment is not available for work:', assignment.status);
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!selectedAssignment || !otpCode.trim()) {
      setOtpError('Please enter the OTP code');
      return;
    }
    
    try {
      setVerifyingOTP(true);
      setOtpError('');
      
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
      
      console.log('Verifying OTP for assignment:', selectedAssignment.id);
      console.log('OTP Code:', otpCode.trim());
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
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
      
      console.log('OTP verification response status:', response.status);
      console.log('OTP verification response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OTP verification error:', errorData);
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
      websocketService.sendComponentCompleted('product', userInfo.id.toString(), buildingAssignment.id, component.id);
      
      // Update the specific component in the state and calculate progress
      setFormulationComponents(prevComponents => {
        const updatedComponents = prevComponents.map(comp => 
          comp.component_chemical_id === component.component_chemical_id 
            ? { ...comp, status: 'COMPLETED', completed_at: new Date().toISOString() }
            : comp
        );
        
        // Update the building assignment progress with the updated components
        const completedCount = updatedComponents.filter(c => c.status === 'COMPLETED').length;
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
      const allCompleted = formulationComponents.every(comp => comp.status === 'COMPLETED');
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
      websocketService.sendAssignmentCompleted('product', userInfo.id.toString(), buildingAssignment.id);
      
      // Close product builder and refresh assignments
      setShowProductBuilder(false);
      setBuildingAssignment(null);
      setProgress({});
      loadAssignments();
      
      alert('Production completed successfully!');
      
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
  
  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingState}>
          <RefreshCw size={32} className={styles.spinning} />
          <p>Loading your production assignments...</p>
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
              <Factory size={28} color="var(--accent-color)" />
            </span>
            Product Team Dashboard
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
            <Package size={16} />
            <span>Product Team - Large Batch Specialist</span>
          </div>
          <p>You handle chemical products with quantities of 2kg or more for bulk production operations.</p>
        </div>
      </div>
      
      {/* Assignments List */}
      <div className={styles.assignmentsSection}>
        <div className={styles.sectionHeader}>
          <h3>Your Production Assignments</h3>
          <div className={styles.assignmentCount}>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {filteredAssignments.length === 0 ? (
          <div className={styles.noAssignments}>
            <Truck size={48} color="var(--text-muted)" />
            <h4>No Active Production Assignments</h4>
            <p>You don't have any active production assignments at the moment. Check back later or contact your administrator.</p>
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
                          <small>ID: {assignment.id}</small>
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
                                onClick={() => handleStartAssignment(assignment)}
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
      
      {/* OTP Verification Modal */}
      {console.log('Rendering OTP modal. showOTPModal:', showOTPModal, 'selectedAssignment:', selectedAssignment)}
      {showOTPModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Shield size={20} />
                Verify OTP to Start Production
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
                <h4>{selectedAssignment?.product_name || 'Unknown Product'}</h4>
                <p>Quantity: {selectedAssignment?.quantity_requested} {selectedAssignment?.unit}</p>
                <p>Time Allotted: {selectedAssignment?.time_allotted_minutes} minutes</p>
                <p className={styles.productNote}>This is a large batch assignment for bulk production operations.</p>
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
                <Factory size={20} />
                Production: {buildingAssignment.product?.name}
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
                  <strong>Type:</strong> Large Batch Production
                </div>
              </div>
              
              {/* Product Building Interface */}
              <div className={styles.builderInterface}>
                <h4>Production Formulation Components</h4>
                <div className={styles.componentsGrid}>
                  {console.log('Rendering components list. formulationComponents:', formulationComponents)}
                  {formulationComponents.length > 0 ? (
                    <>
                      <div className={styles.componentsHeader}>
                        <h5>Formulation Components ({formulationComponents.length})</h5>
                        <div className={styles.progressSummary}>
                          <span>Progress: {formulationComponents.filter(c => c.status === 'COMPLETED').length}/{formulationComponents.length} completed</span>
                        </div>
                      </div>
                      {formulationComponents.map((component, index) => {
                        const isCompleted = component.status === 'COMPLETED';
                        const isPending = component.status === 'PENDING';
                        const chemicalName = component.component_name || `Component ${index + 1}`;
                        const quantity = component.quantity_required || 0;
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
                      })}
                    </>
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
                disabled={!formulationComponents.every(comp => comp.status === 'COMPLETED')}
              >
                <CheckCircle size={16} />
                {formulationComponents.every(comp => comp.status === 'COMPLETED') 
                  ? 'Complete Production' 
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
                <p className={styles.productNote}>Request additional time to complete this production assignment.</p>
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
                <p className={styles.productNote}>Please enter the OTP sent to the admin's phone number to verify your extension request.</p>
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
