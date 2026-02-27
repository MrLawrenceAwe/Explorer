import { useEffect } from 'react';

const LEAVE_WARNING = 'A report is still generating. Leaving will stop it.';

export function useBeforeUnloadWarning(shouldWarn) {
    useEffect(() => {
        if (!shouldWarn) return undefined;
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = LEAVE_WARNING;
            return LEAVE_WARNING;
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [shouldWarn]);
}
