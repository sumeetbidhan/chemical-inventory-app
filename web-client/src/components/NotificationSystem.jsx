import React, { useState, useEffect } from 'react';
import { sendNotification, fetchNotifications, dismissNotification } from '../api/notifications';
import styles from './NotificationSystem.module.scss';

export default function NotificationSystem({ alerts, onDismissAlert }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Send notification to backend
  const sendNotificationToBackend = async (alert) => {
    try {
      const notificationData = {
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        chemical_id: alert.chemicalId,
        timestamp: alert.timestamp,
        recipients: ['admin', 'product'] // Send to admins and product team
      };

      await sendNotification(notificationData);
      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Send notifications for new alerts
  useEffect(() => {
    if (alerts.length > 0) {
      setLoading(true);
      
      // Send notifications for critical alerts immediately
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      criticalAlerts.forEach(alert => {
        sendNotificationToBackend(alert);
      });

      // Send notifications for warning alerts with a delay
      const warningAlerts = alerts.filter(alert => alert.severity === 'warning');
      setTimeout(() => {
        warningAlerts.forEach(alert => {
          sendNotificationToBackend(alert);
        });
      }, 5000); // 5 second delay for warnings

      setLoading(false);
    }
  }, [alerts]);

  // Fetch existing notifications
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDismissNotification = async (notificationId) => {
    try {
      await dismissNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className={styles.notificationSystem}>
      {loading && (
        <div className={styles.loadingIndicator}>
          Sending notifications...
        </div>
      )}
      
      {notifications.length > 0 && (
        <div className={styles.notificationsList}>
          <h4>Recent Notifications</h4>
          {notifications.map(notification => (
            <div 
              key={notification.id}
              className={styles.notificationItem}
              style={{ borderLeftColor: getSeverityColor(notification.severity) }}
            >
              <div className={styles.notificationContent}>
                <span className={styles.notificationIcon}>
                  {getSeverityIcon(notification.severity)}
                </span>
                <div className={styles.notificationText}>
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div className={styles.notificationMeta}>
                    <span className={styles.notificationTime}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                    <span className={styles.notificationType}>
                      {notification.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDismissNotification(notification.id)}
                className={styles.dismissNotification}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 