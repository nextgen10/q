"use client";

import { useEffect } from "react";

export default function CopyProtection() {
    useEffect(() => {
        // Helper to check if the target is an input field
        const isInput = (target: EventTarget | null) => {
            if (!target || !(target instanceof HTMLElement)) return false;
            const tagName = target.tagName.toLowerCase();
            return (
                tagName === 'input' ||
                tagName === 'textarea' ||
                tagName === 'select' ||
                target.isContentEditable
            );
        };

        const preventDefault = (e: Event) => {
            // Allow default behavior if interacting with an input
            if (isInput(e.target)) return;
            e.preventDefault();
        };

        const handleKeydown = (e: KeyboardEvent) => {
            // Allow keyboard shortcuts in inputs
            if (isInput(e.target)) return;

            // Prevent Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+S, Ctrl+P
            if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        };

        // 1. Disable Right Click
        document.addEventListener("contextmenu", preventDefault);

        // 2. Disable Copy/Cut/Paste events explicitly
        document.addEventListener("copy", preventDefault);
        document.addEventListener("cut", preventDefault);

        // 3. Disable Dragging (often used to copy)
        document.addEventListener("dragstart", preventDefault);

        // 4. Disable Keyboard Shortcuts
        document.addEventListener("keydown", handleKeydown);

        return () => {
            document.removeEventListener("contextmenu", preventDefault);
            document.removeEventListener("copy", preventDefault);
            document.removeEventListener("cut", preventDefault);
            document.removeEventListener("dragstart", preventDefault);
            document.removeEventListener("keydown", handleKeydown);
        };
    }, []);

    return null;
}
