import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  ChevronsRight
} from 'lucide-react';
import styles from './TeamDashboard.module.scss';

import { API_BASE } from '../config';

export default function TeamDashboard() {
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
  
  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  
  // Load assignments on component mount
  useEffect(() => {
    if (user && userInfo) {
      loadAssignments();
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
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    if (user && userInfo) {
      const connect = () => {
        try {
          const token = localStorage.getItem('firebase_token');
          if (!token) return;
          
          const ws = new WebSocket(`ws://localhost:8000/ws/team/${userInfo.id}?token=${token}`);
          
          ws.onopen = () => {
            setWsConnected(true);
            console.log('WebSocket connected for team notifications');
          };
          
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          };
          
          ws.onclose = () => {
            setWsConnected(false);
            console.log('WebSocket disconnected');
            setTimeout(connect, 5000);
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsConnected(false);
          };
          
          wsRef.current = ws;
          
        } catch (error) {
          console.error('Failed to connect WebSocket:', error);
        }
      };
      
      connect();
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [user, userInfo]);
  
  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('firebase_token');
      const response = await fetch(`${API_BASE}/assignments/my-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load assignments: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Loaded assignments:', data);
      setAssignments(data);
      
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message received:', data);
    
    switch (data.type) {
      case 'assignment_created':
        loadAssignments(); // Refresh assignments
        break;
      case 'assignment_updated':
        loadAssignments(); // Refresh assignments
        break;
      case 'otp_expired':
        // Show notification for expired OTP
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
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
  
  const handleCompleteAssignment = async () => {
    if (!buildingAssignment) return;
    
    try {
      const token = localStorage.getItem('firebase_token');
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
      
      if (!response.ok) {
        throw new Error('Failed to complete assignment');
      }
      
      // Close product builder and refresh assignments
      setShowProductBuilder(false);
      setBuildingAssignment(null);
      setProgress({});
      loadAssignments();
      
    } catch (err) {
      console.error('Error completing assignment:', err);
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
  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'No time limit';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
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
          <p>Loading your assignments...</p>
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
              <FlaskConical size={28} color="var(--accent-color)" />
            </span>
            {userInfo?.role?.name === 'LAB_STAFF' ? 'Lab Team Dashboard' : 'Product Team Dashboard'}
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
      </div>
      
      {/* Assignments List */}
      <div className={styles.assignmentsSection}>
        <div className={styles.sectionHeader}>
          <h3>Your Assignments</h3>
          <div className={styles.assignmentCount}>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {filteredAssignments.length === 0 ? (
          <div className={styles.noAssignments}>
            <FlaskConical size={48} color="var(--text-muted)" />
            <h4>No Active Assignments</h4>
            <p>You don't have any active assignments at the moment. Check back later or contact your administrator.</p>
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
                          <strong>{assignment.product?.name || 'Unknown Product'}</strong>
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
                          {formatTimeRemaining(assignment.expires_at)}
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
                            <button
                              className={styles.continueBtn}
                              onClick={() => {
                                setBuildingAssignment(assignment);
                                setShowProductBuilder(true);
                              }}
                            >
                              <Play size={16} />
                              Continue
                            </button>
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
      {showOTPModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.modalHeader}>
              <h3>
                <Shield size={20} />
                Verify OTP to Start Assignment
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
                <h4>{selectedAssignment?.product?.name}</h4>
                <p>Quantity: {selectedAssignment?.quantity_requested} {selectedAssignment?.unit}</p>
                <p>Time Allotted: {selectedAssignment?.time_allotted_minutes} minutes</p>
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
                <FlaskConical size={20} />
                Building: {buildingAssignment.product?.name}
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
                  <strong>Time Remaining:</strong> {formatTimeRemaining(buildingAssignment.expires_at)}
                </div>
                <div className={styles.infoItem}>
                  <strong>Progress:</strong> {buildingAssignment.progress_percentage || 0}%
                </div>
              </div>
              
              {/* Product Building Interface */}
              <div className={styles.builderInterface}>
                <h4>Formulation Components</h4>
                <div className={styles.componentsList}>
                  {/* This would be populated with actual formulation components */}
                  <div className={styles.component}>
                    <div className={styles.componentInfo}>
                      <strong>Component 1</strong>
                      <span>Required: 100g</span>
                    </div>
                    <div className={styles.componentActions}>
                      <button 
                        className={styles.completeBtn}
                        onClick={() => handleUpdateProgress(1, 'completed')}
                      >
                        <CheckCircle size={16} />
                        Complete
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.component}>
                    <div className={styles.componentInfo}>
                      <strong>Component 2</strong>
                      <span>Required: 50g</span>
                    </div>
                    <div className={styles.componentActions}>
                      <button 
                        className={styles.completeBtn}
                        onClick={() => handleUpdateProgress(2, 'completed')}
                      >
                        <CheckCircle size={16} />
                        Complete
                      </button>
                    </div>
                  </div>
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
              >
                <CheckCircle size={16} />
                Complete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
