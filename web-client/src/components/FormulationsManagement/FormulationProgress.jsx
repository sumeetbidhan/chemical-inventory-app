import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Play, Pause, RotateCcw } from 'lucide-react';
import styles from './FormulationProgress.module.scss';

const FormulationProgress = ({ 
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

export default FormulationProgress;

