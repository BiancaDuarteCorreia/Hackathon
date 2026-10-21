import { useState, useRef, useCallback, useEffect } from 'react';
import type { AlertState } from './types';

export function useAlert() {
    const [alert, setAlert] = useState<AlertState | null>(null);
    
    const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showAlert = useCallback((type: 'success' | 'error', title: string, message: string) => {
        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }

        setAlert({ type, title, message });

        alertTimeoutRef.current = setTimeout(() => setAlert(null), 4000);
    }, []);

    const clearAlert = useCallback(() => {
        setAlert(null);
        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (alertTimeoutRef.current) {
                clearTimeout(alertTimeoutRef.current);
            }
        };
    }, []);

    return { alert, showAlert, clearAlert };
}