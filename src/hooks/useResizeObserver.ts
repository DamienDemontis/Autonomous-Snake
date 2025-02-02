import { useEffect, useRef } from 'react';

export const useResizeObserver = (
  ref: React.RefObject<HTMLElement | null>,
  callback: (entries: ResizeObserverEntry[]) => void
) => {
  const observerRef = useRef<ResizeObserver | null>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    observerRef.current = new ResizeObserver(callback);
    observerRef.current.observe(ref.current);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, callback]);
}; 