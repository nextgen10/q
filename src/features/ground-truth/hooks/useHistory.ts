import { useState, useCallback } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseHistoryReturn<T> {
    state: T;
    set: (newState: T) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (newState: T) => void;
    clear: () => void;
}

/**
 * Custom hook for managing undo/redo history
 * @param initialState - The initial state value
 * @param maxHistory - Maximum number of history items to keep (default: 50)
 * @returns History management functions and state
 */
export function useHistory<T>(initialState: T, maxHistory = 50): UseHistoryReturn<T> {
    const [state, setState] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    const set = useCallback((newPresent: T) => {
        setState(currentState => {
            // Don't add to history if value hasn't changed
            if (JSON.stringify(currentState.present) === JSON.stringify(newPresent)) {
                return currentState;
            }

            const newPast = [...currentState.past, currentState.present];

            // Limit history size
            if (newPast.length > maxHistory) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: newPresent,
                future: []
            };
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        setState(currentState => {
            if (currentState.past.length === 0) {
                return currentState;
            }

            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [currentState.present, ...currentState.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState(currentState => {
            if (currentState.future.length === 0) {
                return currentState;
            }

            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);

            return {
                past: [...currentState.past, currentState.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const reset = useCallback((newState: T) => {
        setState({
            past: [],
            present: newState,
            future: []
        });
    }, []);

    const clear = useCallback(() => {
        setState(currentState => ({
            past: [],
            present: currentState.present,
            future: []
        }));
    }, []);

    return {
        state: state.present,
        set,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        reset,
        clear
    };
}
