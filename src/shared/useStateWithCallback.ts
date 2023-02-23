import {MutableRefObject, useCallback, useEffect, useRef, useState} from "react";

type newStateType<U> = (arg: U) => U | U;

export function useStateWithCallback<T>(initialState: T): [state: T, updateState: (newState: newStateType<T>, cb: () => void) => void] {
    const [state, setState] = useState<T>(initialState);
    const cbRef = useRef<((arg: T) => void) | null>(null);

    const updateState = useCallback((newState: newStateType<T>, cb: () => void) => {
        cbRef.current = cb;

        setState((prev: T) => typeof newState === 'function' ? newState(prev) : newState);
    }, []);

    useEffect(() => {
        if (cbRef.current) {
            cbRef.current(state);
            cbRef.current = null;
        }
    }, [state]);

    return [state, updateState];
}