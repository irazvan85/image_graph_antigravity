import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const Toast = ({ id, type, message, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, 4000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    const icons = {
        success: <CheckCircle size={18} />,
        error: <XCircle size={18} />,
        warning: <AlertCircle size={18} />,
        info: <Info size={18} />
    };

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'var(--accent-success)', icon: 'var(--accent-success)' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'var(--accent-error)', icon: 'var(--accent-error)' },
        warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'var(--accent-warning)', icon: 'var(--accent-warning)' },
        info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'var(--accent-primary)', icon: 'var(--accent-primary)' }
    };

    const colorScheme = colors[type] || colors.info;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: colorScheme.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${colorScheme.border}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                minWidth: '280px',
                maxWidth: '400px',
                animation: isExiting ? 'slideOut 0.3s ease forwards' : 'slideIn 0.3s ease',
                transform: isExiting ? 'translateX(100%)' : 'translateX(0)'
            }}
        >
            <div style={{ color: colorScheme.icon, flexShrink: 0 }}>
                {icons[type]}
            </div>
            <div style={{ flex: 1 }}>{message}</div>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => onClose(id), 300);
                }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (message) => addToast('success', message),
        error: (message) => addToast('error', message),
        warning: (message) => addToast('warning', message),
        info: (message) => addToast('info', message)
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <style>
                {`
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `}
            </style>
            <div
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}
            >
                {toasts.map(t => (
                    <div key={t.id} style={{ pointerEvents: 'auto' }}>
                        <Toast {...t} onClose={removeToast} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
