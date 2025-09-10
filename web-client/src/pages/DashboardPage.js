import React, { useEffect, useState } from 'react';
import styles from './DashboardPage.module.scss';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle, Hand, FlaskConical, Users, DollarSign, Shield, Heart } from 'lucide-react';
import LabDashboard from '../components/LabDashboard';
import ProductDashboard from '../components/ProductDashboard';
import AccountTeamDashboard from '../components/AccountTeamDashboard';

const API_BASE = 'http://localhost:8000';

const DashboardPage = () => {
  const { user, loading, userInfo, backendAvailable, triggerHeartbeat } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAppGuide, setShowAppGuide] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userInfo) {
      setPending(!userInfo.is_approved);
      setFetching(false);
    } else if (!loading && user) {
      // If we have a user but no userInfo, they might be pending
      setPending(true);
      setFetching(false);
    }
  }, [userInfo, loading, user]);

  const handleTestHeartbeat = async () => {
    console.log('Testing heartbeat manually...');
    await triggerHeartbeat();
  };

  if (loading || fetching) return <div className={styles.dashboardContainer}>Loading...</div>;
  if (!user) return null;
  
  // Show pending approval message first (before backend connection warning)
  if (pending) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2>Account Pending Approval</h2>
        </div>
        <div style={{ 
          background: 'var(--warning-color)', 
          color: 'white', 
          padding: '32px', 
          borderRadius: '12px',
          textAlign: 'center',
          opacity: 0.9,
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <Clock size={48} color="white" />
          </div>
          <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>
            Welcome, {userInfo?.first_name || user.email}!
          </h3>
          <p style={{ fontSize: '18px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Your account is pending admin approval. You will be able to access the chemical inventory system once an administrator approves your account.
          </p>
          <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: '1.4' }}>
            Please contact your system administrator or wait for approval notification.
          </p>
        </div>
        
        <div style={{ 
          background: 'var(--card-bg)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '24px',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary-text)' }}>What happens next?</h4>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0, 
            textAlign: 'left',
            display: 'inline-block'
          }}>
            <li style={{ margin: '8px 0', padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              Admin reviews your registration
            </li>
            <li style={{ margin: '8px 0', padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              Account gets approved with appropriate role
            </li>
            <li style={{ margin: '8px 0', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success-color)" />
              You receive access to the chemical inventory system
            </li>
          </ul>
        </div>
      </div>
    );
  }
  
  // Show backend connection warning if backend is not available (only for approved users)
  if (!backendAvailable) {
    return (
      <div className={styles.dashboardContainer}>
        <div style={{ 
          background: 'var(--warning-color)', 
          border: '1px solid var(--warning-color)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '24px',
          color: 'white',
          opacity: 0.9
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={20} color="white" />
            <strong>Backend Connection Warning:</strong>
          </div>
          The backend server appears to be offline. 
          Some features may not work properly. Please ensure the backend server is running.
        </div>
        
        <div className={styles.dashboardHeader}>
          <h2>Welcome, {userInfo?.first_name || user.email}</h2>
        </div>
        <div className={styles.userInfo}>
          <div>
            <strong>Email Address</strong>
            <span>{user.email}</span>
          </div>
          <div>
            <strong>Email Verified</strong>
            <span>{user.emailVerified ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <strong>Backend Status</strong>
            <span style={{ color: 'var(--error-color)' }}>Offline</span>
          </div>
        </div>
        
        <div className={styles.quickAccessBox}>
          <button className={styles.bigButton} onClick={() => navigate('/chemicals')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <FlaskConical size={24} />
              Chemical Inventory
            </span>
          </button>
        </div>
        
        <div className={styles.permissionsBox}>
          <h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Limited Mode
            </span>
          </h4>
          <ul>
            <li><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory (if cached)</span></li>
            <li><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Basic navigation</span></li>
          </ul>
        </div>
      </div>
    );
  }

  // Check user role and show appropriate dashboard
  const getUserDashboard = () => {
    if (!userInfo) {
      console.log('🔍 No userInfo available');
      return null;
    }
    const role = userInfo.role?.name || userInfo.role;
    
    console.log('🔍 Dashboard Debug:', {
      userInfo,
      role,
      roleName: userInfo.role?.name,
      roleId: userInfo.role_id,
      isLabStaff: role === 'LAB_STAFF' || role === 'lab_staff' || userInfo.role_id === 2,
      isProductTeam: role === 'PRODUCT_TEAM' || role === 'product_team' || userInfo.role_id === 3,
      isAccountTeam: role === 'ACCOUNT_TEAM' || role === 'account_team' || userInfo.role_id === 4
    });
    
    // Check both role name and role_id
    const isLabStaff = role === 'LAB' || role === 'lab' || role === 'LAB_STAFF' || role === 'lab_staff' || userInfo.role_id === 2;
    const isProductTeam = role === 'PRODUCT' || role === 'product' || role === 'PRODUCT_TEAM' || role === 'product_team' || userInfo.role_id === 3;
    const isAccountTeam = role === 'ACCOUNTS' || role === 'accounts' || role === 'ACCOUNT_TEAM' || role === 'account_team' || userInfo.role_id === 4;
    
    if (isLabStaff) {
      return <LabDashboard />;
    } else if (isProductTeam) {
      return <ProductDashboard />;
    } else if (isAccountTeam) {
      return <AccountTeamDashboard />;
    }
    
    return null;
  };

  // Show specific dashboard for team users
  const teamDashboard = getUserDashboard();
  if (teamDashboard) {
    return teamDashboard;
  }

  // Role-based dashboard content
  const renderDashboardContent = () => {
    if (!userInfo) return null;
    const role = userInfo.role?.name || userInfo.role;
    return (
      <>
        <div className={styles.quickAccessBox}>
          <button className={styles.bigButton} onClick={() => navigate('/chemicals')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <FlaskConical size={24} />
              Chemical Inventory
            </span>
          </button>
          {role === 'admin' || role === 'ADMIN' && (
            <button className={styles.bigButton} onClick={() => navigate('/admin')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <Users size={24} />
                Admin Management
              </span>
            </button>
          )}
          {role === 'account' && (
            <button className={styles.bigButton} onClick={() => navigate('/account')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <DollarSign size={24} />
                Account Team
              </span>
            </button>
          )}
        </div>
        
        <div className={styles.permissionsBox}>
          <h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Your Permissions
            </span>
          </h4>
          <ul>
            {role === 'admin' || role === 'ADMIN' && [
              <li key="manage_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage users</span></li>,
              <li key="manage_invitations"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage invitations</span></li>,
              <li key="view_logs"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View logs</span></li>,
              <li key="approve_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Approve users</span></li>,
              <li key="delete_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Delete users</span></li>,
              <li key="modify_users"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Modify users</span></li>,
            ]}
            {role === 'lab_staff' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="add_chemicals"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Add chemicals</span></li>,
              <li key="update_chemicals"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Update chemicals</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="manage_safety_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage safety data</span></li>,
            ]}
            {role === 'product' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="export_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Export data</span></li>,
              <li key="manage_product_info"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage product info</span></li>,
            ]}
            {role === 'account' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View reports</span></li>,
              <li key="manage_accounts"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Manage accounts</span></li>,
              <li key="view_financial_data"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View financial data</span></li>,
            ]}
            {role === 'all_users' && [
              <li key="view_inventory"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View inventory (read-only)</span></li>,
              <li key="view_reports"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />View basic reports</span></li>,
              <li key="limited_access"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="var(--success-color)" />Limited system access</span></li>,
            ]}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <Hand size={28} color="var(--accent-color)" />
            Welcome, {userInfo?.first_name || user.email}
          </span>
        </h2>
        <button 
          className={styles.appGuideBtn}
          onClick={() => setShowAppGuide(true)}
          title="Learn how the app works"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={18} />
            How the App Works
          </span>
        </button>
      </div>
      <div className={styles.userInfo}>
        <div>
          <strong>Name</strong>
          <span>{userInfo?.first_name} {userInfo?.last_name || ''}</span>
        </div>
        <div>
          <strong>Email Address</strong>
          <span>{userInfo?.email || user.email}</span>
        </div>
        <div>
          <strong>Phone Number</strong>
          <span>{userInfo?.phone || 'Not provided'}</span>
        </div>
        <div>
          <strong>User Role</strong>
          <span>{((userInfo?.role?.name || userInfo?.role) || 'Basic User').replace('_', ' ').toUpperCase()}</span>
        </div>
        <div>
          <strong>Email Verified</strong>
          <span>{user.emailVerified ? 'Yes' : 'No'}</span>
        </div>
        <div>
          <strong>Backend Status</strong>
          <span style={{ color: 'var(--success-color)' }}>Online</span>
        </div>
        <div>
          <strong>Account Status</strong>
          <span style={{ color: 'var(--success-color)' }}>Active</span>
        </div>
      </div>
      
      {renderDashboardContent()}
      
      {/* How the App Works Modal */}
      {showAppGuide && (
        <div className={styles.modalOverlay}>
          <div className={styles.appGuideModal}>
            <div className={styles.modalHeader}>
              <h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                  <Heart size={24} color="var(--accent-color)" />
                  How the Chemical Inventory App Works
                </span>
              </h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowAppGuide(false)}
                title="Close guide"
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {/* OTP-based Formulation Viewer */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <FlaskConical size={20} color="var(--accent-color)" />
                    OTP-based Formulation Viewer
                  </span>
                </h3>
                <p>Our system uses One-Time Passwords (OTPs) to securely manage chemical formulations. Each formulation has a time-limited access period to ensure safety and accountability.</p>
                <ul>
                  <li><strong>Secure Access:</strong> Formulations are protected with time-limited OTPs</li>
                  <li><strong>Safety First:</strong> Prevents unauthorized access to chemical recipes</li>
                  <li><strong>Accountability:</strong> Tracks who accessed what and when</li>
                </ul>
              </section>

              {/* Team Assignment Logic */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--accent-color)" />
                    Team Assignment Logic
                  </span>
                </h3>
                <p>Chemical products are automatically assigned to teams based on quantity thresholds to optimize workflow efficiency.</p>
                <div className={styles.assignmentLogic}>
                  <div className={styles.assignmentRule}>
                    <div className={styles.ruleIcon}>🧪</div>
                    <div className={styles.ruleContent}>
                      <strong>Lab Staff Assignment:</strong>
                      <span>Chemical products with quantity &lt; 2kg</span>
                      <small>Small quantities are handled by lab technicians for precise measurements</small>
                    </div>
                  </div>
                  <div className={styles.assignmentRule}>
                    <div className={styles.ruleIcon}>🏭</div>
                    <div className={styles.ruleContent}>
                      <strong>Product Team Assignment:</strong>
                      <span>Chemical products with quantity ≥ 2kg</span>
                      <small>Larger quantities are managed by product specialists for bulk operations</small>
                    </div>
                  </div>
                </div>
              </section>

              {/* Accounts Team Workflow */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={20} color="var(--accent-color)" />
                    Accounts Team Workflow
                  </span>
                </h3>
                <p>The Accounts team manages all financial transactions and purchase orders for chemical procurement.</p>
                <div className={styles.workflowSteps}>
                  <div className={styles.workflowStep}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      <strong>Admin Request:</strong> Administrators request purchase of chemicals
                    </div>
                  </div>
                  <div className={styles.workflowStep}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      <strong>Purchase Execution:</strong> Accounts team buys chemicals from suppliers
                    </div>
                  </div>
                  <div className={styles.workflowStep}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      <strong>Stock Update:</strong> Inventory is automatically updated upon receipt
                    </div>
                  </div>
                  <div className={styles.workflowStep}>
                    <div className={styles.stepNumber}>4</div>
                    <div className={styles.stepContent}>
                      <strong>History Tracking:</strong> Purchase history is visible in Stock Management
                    </div>
                  </div>
                </div>
              </section>

              {/* Alerts System */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} color="var(--warning-color)" />
                    Alert System
                  </span>
                </h3>
                <p>Our intelligent alert system keeps you informed about critical situations that require attention.</p>
                <div className={styles.alertTypes}>
                  <div className={styles.alertType}>
                    <div className={styles.alertIcon}>⚠️</div>
                    <div className={styles.alertContent}>
                      <strong>Low Stock Alerts:</strong>
                      <span>Notifications when chemical quantities fall below safety thresholds</span>
                    </div>
                  </div>
                  <div className={styles.alertType}>
                    <div className={styles.alertIcon}>⏰</div>
                    <div className={styles.alertContent}>
                      <strong>OTP Expiration Alerts:</strong>
                      <span>Shows which chemical product's OTP has expired</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Formulation Tracking */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={20} color="var(--success-color)" />
                    Formulation Tracking
                  </span>
                </h3>
                <p>Every formulation is carefully tracked with predefined proportions and real-time progress monitoring.</p>
                <div className={styles.trackingFeatures}>
                  <div className={styles.trackingFeature}>
                    <strong>Predefined Proportions:</strong>
                    <span>Each formulation has exact chemical ratios and quantities</span>
                  </div>
                  <div className={styles.trackingFeature}>
                    <strong>Scalable Quantities:</strong>
                    <span>Formulations can be scaled to required batch sizes</span>
                  </div>
                  <div className={styles.trackingFeature}>
                    <strong>Live Progress Tracking:</strong>
                    <span>Admin can monitor real-time progress with visual indicators</span>
                  </div>
                </div>
                
                <div className={styles.progressIndicators}>
                  <h4>Progress Indicators:</h4>
                  <div className={styles.indicatorExamples}>
                    <div className={styles.indicator}>
                      <span className={styles.indicatorIcon}>✅</span>
                      <span><strong>Green Tick:</strong> Chemical component completed</span>
                    </div>
                    <div className={styles.indicator}>
                      <span className={styles.indicatorIcon}>❌</span>
                      <span><strong>Red Cross:</strong> Chemical component pending</span>
                    </div>
                  </div>
                </div>

                <div className={styles.otpExtensions}>
                  <h4>OTP Extension Requests:</h4>
                  <p>Teams can request OTP extensions if they can't finish formulations within the allocated time, ensuring flexibility while maintaining security.</p>
                </div>
              </section>

              {/* System Benefits */}
              <section className={styles.guideSection}>
                <h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={20} color="var(--success-color)" />
                    System Benefits
                  </span>
                </h3>
                <div className={styles.benefitsGrid}>
                  <div className={styles.benefit}>
                    <strong>🔒 Enhanced Security</strong>
                    <span>OTP-based access control prevents unauthorized formulation access</span>
                  </div>
                  <div className={styles.benefit}>
                    <strong>⚡ Efficient Workflow</strong>
                    <span>Automatic team assignments optimize resource utilization</span>
                  </div>
                  <div className={styles.benefit}>
                    <strong>📊 Real-time Monitoring</strong>
                    <span>Live progress tracking ensures transparency and accountability</span>
                  </div>
                  <div className={styles.benefit}>
                    <strong>🚨 Proactive Alerts</strong>
                    <span>Intelligent notifications prevent stockouts and OTP issues</span>
                  </div>
                  <div className={styles.benefit}>
                    <strong>💰 Cost Control</strong>
                    <span>Centralized purchase management and financial tracking</span>
                  </div>
                  <div className={styles.benefit}>
                    <strong>📈 Scalability</strong>
                    <span>Flexible formulation scaling for different batch requirements</span>
                  </div>
                </div>
              </section>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.modalBtnPrimary}
                onClick={() => setShowAppGuide(false)}
              >
                Got it! I understand how the app works
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 