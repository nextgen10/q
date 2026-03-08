import React, { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

export function StatusSnackbar({
    status,
    onClose,
    autoHideDuration = 3000,
    anchorOrigin = { vertical: "bottom", horizontal: "right" },
}) {
    const open = Boolean(status);
    const [lastStatus, setLastStatus] = useState(status || null);

    useEffect(() => {
        if (status) {
            setLastStatus(status);
        }
    }, [status]);

    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={anchorOrigin}
        >
            <Alert
                severity={lastStatus?.severity || "success"}
                onClose={onClose}
                sx={{ width: "100%" }}
                variant="filled"
            >
                {lastStatus?.message || ""}
            </Alert>
        </Snackbar>
    );
}

