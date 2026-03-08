'use client';
import { useState, createContext, useContext, ReactNode } from 'react';
import { AlertColor, Dialog, DialogTitle, DialogContent, DialogActions, Button, DialogContentText } from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';

interface NotificationContextType {
    showNotification: (message: string, severity?: AlertColor) => void;
    showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
    showConfirmAsync: (message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState<AlertColor>('info');

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
    const [cancelCallback, setCancelCallback] = useState<(() => void) | null>(null);

    const showNotification = (msg: string, sev: AlertColor = 'info') => {
        setMessage(msg);
        setSeverity(sev);
        setSnackbarOpen(true);
    };

    const showConfirm = (msg: string, onConfirm: () => void, onCancel?: () => void) => {
        setConfirmMessage(msg);
        setConfirmCallback(() => onConfirm);
        setCancelCallback(() => onCancel);
        setConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmCallback) {
            confirmCallback();
        }
        setConfirmOpen(false);
        setConfirmCallback(null);
        setCancelCallback(null);
    };

    const handleCancel = () => {
        if (cancelCallback) {
            cancelCallback();
        }
        setConfirmOpen(false);
        setConfirmCallback(null);
        setCancelCallback(null);
    };

    const showConfirmAsync = (msg: string): Promise<boolean> => {
        return new Promise((resolve) => {
            showConfirm(msg, () => resolve(true), () => resolve(false));
        });
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm, showConfirmAsync }}>
            {children}

            <UBSSnackbar
                open={snackbarOpen}
                message={message}
                severity={severity as SnackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
                autoHideDuration={4000}
            />

            {/* Dialog for confirmations */}
            <Dialog
                open={confirmOpen}
                onClose={handleCancel}
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 6,
                    },
                }}
            >
                <DialogTitle id="confirm-dialog-title">Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                        {confirmMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} variant="contained" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
}
