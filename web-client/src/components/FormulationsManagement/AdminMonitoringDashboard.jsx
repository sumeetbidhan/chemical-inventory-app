import React, { useState, useEffect } from 'react';
import { Eye, Clock, Users, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './AdminMonitoringDashboard.module.scss';

const AdminMonitoringDashboard = ({ 
  assignments = [], 
  extensionRequests = [],
  onRefresh,
  onExtendTime,
  onViewDetails,
  onApproveExtension,
  onRejectExtension,
  onDeleteAssignment,
  loading = false 
}) => {
  const [filter, setFilter] = useState('all'); // all, active, completed, expired
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedExtensionRequest, setSelectedExtensionRequest] = useState(null);
  const [extensionAction, setExtensionAction] = useState(''); // 'approve' or 'reject'
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [rejectionReason, setRejectionReason] = useState('');

  // Debug logging
  console.log('🔍 AdminMonitoringDashboard - Received assignments:', assignments);
  console.log('🔍 AdminMonitoringDashboard - Assignments length:', assignments?.length);
  if (assignments && assignments.length > 0) {
    console.log('🔍 AdminMonitoringDashboard - First assignment:', assignments[0]);
    console.log('🔍 AdminMonitoringDashboard - First assignment status:', assignments[0].status);
    console.log('🔍 AdminMonitoringDashboard - First assignment progress:', assignments[0].progress_percentage);
    console.log('🔍 AdminMonitoringDashboard - First assignment time remaining:', assignments[0].time_remaining);
  }


  // Filter assignments based on status
  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && (assignment.status === 'IN_PROGRESS' || assignment.status === 'ASSIGNED')) ||
      (filter === 'completed' && assignment.status === 'COMPLETED') ||
      (filter === 'expired' && assignment.status === 'EXPIRED');
    
    return matchesFilter;
  });

  const getStatusBadge = (assignment) => {
    console.log('🔍 getStatusBadge - Assignment:', assignment);
    console.log('🔍 getStatusBadge - Status:', assignment.status);
    console.log('🔍 getStatusBadge - Status type:', typeof assignment.status);
    
    if (assignment.status === 'COMPLETED') {
      console.log('✅ Status: COMPLETED');
      return { text: 'Completed', class: 'completed' };
    } else if (assignment.status === 'EXPIRED') {
      console.log('⏰ Status: EXPIRED');
      return { text: 'Expired', class: 'expired' };
    } else if (assignment.status === 'IN_PROGRESS') {
      console.log('🔄 Status: IN_PROGRESS');
      return { text: 'In Progress', class: 'active' };
    } else if (assignment.status === 'ASSIGNED') {
      console.log('📋 Status: ASSIGNED');
      return { text: 'Assigned (OTP Required)', class: 'pending' };
    } else {
      console.log('❓ Status: UNKNOWN -', assignment.status);
      return { text: 'Unknown', class: 'unknown' };
    }
  };

  const getTimeRemaining = (assignment) => {
    console.log('⏰ getTimeRemaining - Assignment:', assignment);
    console.log('⏰ getTimeRemaining - Status:', assignment.status);
    console.log('⏰ getTimeRemaining - time_remaining:', assignment.time_remaining);
    console.log('⏰ getTimeRemaining - expires_at:', assignment.expires_at);
    
    // If assignment is ASSIGNED, show OTP required message
    if (assignment.status === 'ASSIGNED') {
      console.log('⏰ getTimeRemaining - Assignment is ASSIGNED, OTP required');
      return 'OTP Required';
    }
    
    // Use the time_remaining from the API response
    if (assignment.time_remaining !== undefined && assignment.time_remaining !== null) {
      const totalMinutes = assignment.time_remaining;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const seconds = 0; // We don't have second-level precision from the API

      const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      console.log('⏰ getTimeRemaining - Result from time_remaining:', result);
      return result;
    }

    // Fallback to calculating from expires_at if available
    if (assignment.expires_at) {
      const now = new Date();
      const endTime = new Date(assignment.expires_at);
      const remaining = endTime - now;

      if (remaining <= 0) {
        console.log('⏰ getTimeRemaining - Time expired');
        return '00:00:00';
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      console.log('⏰ getTimeRemaining - Result from expires_at:', result);
      return result;
    }

    console.log('⏰ getTimeRemaining - No time data available, returning 00:00:00');
    return '00:00:00';
  };

  const getProgressPercentage = (assignment) => {
    console.log('📊 getProgressPercentage - Assignment:', assignment);
    console.log('📊 getProgressPercentage - progress_percentage:', assignment.progress_percentage);
    console.log('📊 getProgressPercentage - components:', assignment.components);
    
    // Always calculate from actual component completion
    if (!assignment.components || assignment.components.length === 0) {
      console.log('📊 getProgressPercentage - No components, returning 0');
      return 0;
    }
    
    const completedCount = assignment.components.filter(comp => 
      comp.completed || comp.status === 'COMPLETED'
    ).length;
    const calculated = Math.round((completedCount / assignment.components.length) * 100);
    console.log('📊 getProgressPercentage - Calculated from components:', calculated, `(${completedCount}/${assignment.components.length})`);
    return calculated;
  };

  const getTeamTypeBadge = (assignment) => {
    console.log('🔍 getTeamTypeBadge - Assignment:', assignment);
    console.log('🔍 getTeamTypeBadge - team_type:', assignment.team_type);
    
    // Use the actual team_type from the assignment data
    if (assignment.team_type === 'PRODUCT_TEAM') {
      console.log('✅ Team type: Product Team');
      return 'Product Team';
    } else if (assignment.team_type === 'LAB_STAFF') {
      console.log('✅ Team type: Lab');
      return 'Lab';
    } else if (assignment.team_type === 'ACCOUNT_TEAM') {
      console.log('✅ Team type: Account Team');
      return 'Account Team';
    } else {
      console.log('❓ Unknown team type:', assignment.team_type);
      return 'Unknown';
    }
  };

  const handleExtensionAction = (request, action) => {
    setSelectedExtensionRequest(request);
    setExtensionAction(action);
    setExtensionMinutes(request.requested_extension_minutes);
    setRejectionReason('');
    setShowExtensionModal(true);
  };

  const handleExtensionSubmit = () => {
    if (!selectedExtensionRequest) return;

    if (extensionAction === 'approve') {
      onApproveExtension(selectedExtensionRequest.id, extensionMinutes);
    } else if (extensionAction === 'reject') {
      onRejectExtension(selectedExtensionRequest.id, rejectionReason);
    }
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

      {/* Filters */}
      <div className={styles.controls}>
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

      {/* Extension Requests Section */}
      {extensionRequests.length > 0 && (
        <div className={styles.extensionRequestsSection}>
          <h3>Pending Extension Requests ({extensionRequests.length})</h3>
          <div className={styles.extensionRequestsList}>
            {extensionRequests.map(request => (
              <div key={request.id} className={styles.extensionRequestCard}>
                <div className={styles.requestHeader}>
                  <div className={styles.requestInfo}>
                    <h4>{request.product_name}</h4>
                    <p>Requested by: {request.requested_by_name}</p>
                    <p>Extension: {request.requested_extension_minutes} minutes</p>
                  </div>
                  <div className={styles.requestActions}>
                    <button
                      onClick={() => handleExtensionAction(request, 'approve')}
                      className={styles.approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleExtensionAction(request, 'reject')}
                      className={styles.rejectBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className={styles.requestReason}>
                  <strong>Reason:</strong> {request.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <h3>{assignment.product_name}</h3>
                    <div className={styles.targetInfo}>
                      Target: {assignment.target_quantity} {assignment.target_unit}
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
                    {assignment.components?.filter(c => c.completed).length || 0} / {assignment.components?.length || 0} components completed
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
                  {assignment.components?.slice(0, 3).map((component, index) => (
                    <div key={index} className={styles.componentStatus}>
                      <div className={styles.componentName}>
                        {component.code || component.name}
                      </div>
                      <div className={styles.componentStatusIcon}>
                        {component.completed ? (
                          <CheckCircle size={16} className={styles.completedIcon} />
                        ) : (
                          <XCircle size={16} className={styles.pendingIcon} />
                        )}
                      </div>
                    </div>
                  ))}
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
                  <button
                    onClick={() => onDeleteAssignment(assignment.id)}
                    className={styles.deleteBtn}
                    title="Delete Assignment"
                  >
                    <XCircle size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Extension Request Modal */}
      {showExtensionModal && selectedExtensionRequest && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {extensionAction === 'approve' ? 'Approve' : 'Reject'} Extension Request
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowExtensionModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.requestInfo}>
                <h4>{selectedExtensionRequest.product_name}</h4>
                <p>Requested by: {selectedExtensionRequest.requested_by_name}</p>
                <p>Original request: {selectedExtensionRequest.requested_extension_minutes} minutes</p>
                <p><strong>Reason:</strong> {selectedExtensionRequest.reason}</p>
              </div>
              
              {extensionAction === 'approve' ? (
                <div className={styles.approveSection}>
                  <label htmlFor="extensionMinutes">Extension Time (minutes):</label>
                  <input
                    id="extensionMinutes"
                    type="number"
                    value={extensionMinutes}
                    onChange={(e) => setExtensionMinutes(parseInt(e.target.value) || 0)}
                    min="1"
                    max="480"
                  />
                </div>
              ) : (
                <div className={styles.rejectSection}>
                  <label htmlFor="rejectionReason">Rejection Reason:</label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowExtensionModal(false)}
              >
                Cancel
              </button>
              <button
                className={extensionAction === 'approve' ? styles.approveBtn : styles.rejectBtn}
                onClick={handleExtensionSubmit}
                disabled={extensionAction === 'reject' && !rejectionReason.trim()}
              >
                {extensionAction === 'approve' ? 'Approve' : 'Reject'} Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoringDashboard;

