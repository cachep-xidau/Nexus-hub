import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for making a side panel resizable via left-edge drag.
 * Returns panelWidth, drag handle props, and inline style.
 */
export function useResizablePanel(defaultWidth = 420, minWidth = 360, maxWidthVw = 80) {
    const [width, setWidth] = useState(defaultWidth);
    const dragging = useRef(false);
    const startX = useRef(0);
    const startW = useRef(defaultWidth);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        startX.current = e.clientX;
        startW.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [width]);

    useEffect(() => {
        const maxPx = () => window.innerWidth * (maxWidthVw / 100);

        const onMouseMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            // Panel is on the right, so dragging left = increasing width
            const delta = startX.current - e.clientX;
            const newW = Math.min(maxPx(), Math.max(minWidth, startW.current + delta));
            setWidth(newW);
        };

        const onMouseUp = () => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [minWidth, maxWidthVw]);

    const panelStyle = { width: `${width}px` } as const;

    return { width, panelStyle, onMouseDown };
}
