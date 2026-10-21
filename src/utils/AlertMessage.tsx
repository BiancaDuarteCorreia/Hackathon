import { X } from 'lucide-react';
import type { AlertState } from './types';

interface AlertMessageProps {
    alert: AlertState | null;
    onClose: () => void;
}

export default function AlertMessage({ alert, onClose }: AlertMessageProps) {
    if (!alert) return null;

    const isError = alert.type === 'error';
    
    const alertClasses = isError
        ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900"
        : "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900";

    return (
        <div
            role="alert"
            className={`fixed top-4 right-4 z-[999999] p-4 rounded-xl shadow-lg border text-sm max-w-sm flex items-center justify-between gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${alertClasses}`}
        >
            <div className="flex-1">
                <span className="font-bold">{alert.title}</span>: {alert.message}
            </div>
            <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300"
                aria-label="Fechar alerta"
            >
                <X size={16} />
            </button>
        </div>
    );
}