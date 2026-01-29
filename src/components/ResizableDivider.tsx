import { useCallback, useEffect, useState } from 'react';

interface ResizableDividerProps {
  onResize: (delta: number) => void;
}

export function ResizableDivider({ onResize }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onResize(-e.movementX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize]);

  return (
    <div
      className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
}
