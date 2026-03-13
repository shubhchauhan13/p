import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

let toastId = 0;
let addToastGlobal = null;

// Global function to show toasts from anywhere
export function showToast(message, type = 'info', duration = 4000) {
    if (addToastGlobal) {
        addToastGlobal({ id: ++toastId, message, type, duration });
    }
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        setToasts(prev => [...prev, { ...toast, entering: true }]);
        // Auto-remove after duration
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 300);
        }, toast.duration || 4000);
    }, []);

    useEffect(() => {
        addToastGlobal = addToast;
        return () => { addToastGlobal = null; };
    }, [addToast]);

    const dismiss = (id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} />;
            case 'error': return <XCircle size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            default: return <Info size={16} />;
        }
    };

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
                    onClick={() => dismiss(toast.id)}
                >
                    <span className="toast-icon">{getIcon(toast.type)}</span>
                    <span className="toast-message">{toast.message}</span>
                    <button className="toast-close"><X size={14} /></button>
                </div>
            ))}
        </div>
    );
}
