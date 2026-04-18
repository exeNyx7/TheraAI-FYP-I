/**
 * Toast Notification System
 * Provides success, error, and info notifications
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

// Toast types
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Initial state
const initialState = {
  toasts: [],
};

// Action types
const TOAST_ACTIONS = {
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  CLEAR_ALL: 'CLEAR_ALL',
};

// Reducer
function toastReducer(state, action) {
  switch (action.type) {
    case TOAST_ACTIONS.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case TOAST_ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    case TOAST_ACTIONS.CLEAR_ALL:
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
}

// Context
const ToastContext = createContext();

// Provider component
export function ToastProvider({ children }) {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  const addToast = useCallback((message, type = TOAST_TYPES.INFO, duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration,
    };

    dispatch({ type: TOAST_ACTIONS.ADD_TOAST, payload: toast });

    // Auto remove toast after duration
    setTimeout(() => {
      dispatch({ type: TOAST_ACTIONS.REMOVE_TOAST, payload: id });
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: TOAST_ACTIONS.REMOVE_TOAST, payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: TOAST_ACTIONS.CLEAR_ALL });
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, duration) => 
    addToast(message, TOAST_TYPES.SUCCESS, duration), [addToast]);
    
  const showError = useCallback((message, duration) => 
    addToast(message, TOAST_TYPES.ERROR, duration), [addToast]);
    
  const showWarning = useCallback((message, duration) => 
    addToast(message, TOAST_TYPES.WARNING, duration), [addToast]);
    
  const showInfo = useCallback((message, duration) => 
    addToast(message, TOAST_TYPES.INFO, duration), [addToast]);

  const value = {
    toasts: state.toasts,
    addToast,
    removeToast,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />

      ))}
    </div>
  );
}

const TOAST_CONFIG = {
  success: {
    Icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    borderClass: 'border-l-emerald-500',
  },
  error: {
    Icon: XCircle,
    iconClass: 'text-red-500',
    borderClass: 'border-l-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
    borderClass: 'border-l-amber-500',
  },
  info: {
    Icon: Info,
    iconClass: 'text-blue-500',
    borderClass: 'border-l-blue-500',
  },
};

// Individual Toast Component
function Toast({ toast, onClose }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const { Icon, iconClass, borderClass } = config;

  return (
    <div
      className={`toast-item flex items-start gap-3 p-4 rounded-xl bg-card border border-border border-l-4 ${borderClass} shadow-lg min-w-[300px] max-w-[420px] pointer-events-auto`}
      style={{ animation: 'slideInFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <p className="flex-1 text-sm font-medium text-card-foreground leading-relaxed">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Close notification"
        className="text-muted-foreground hover:text-foreground transition-colors ml-1 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { TOAST_TYPES };
export default ToastContext;