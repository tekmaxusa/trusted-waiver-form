import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64Image: string) => void;
  onClear: () => void;
  /** Clears the pad when parent clears committed signature (e.g. form reset). */
  committedSignature: string;
  error?: string;
}

export default function SignaturePad({
  onSave,
  onClear,
  committedSignature,
  error,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInkRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const layoutCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.25;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    layoutCanvas();
    const ro = new ResizeObserver(() => layoutCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /** Reset pad pixels when committed signature is cleared externally. */
  useEffect(() => {
    if (!committedSignature) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      layoutCanvas();
      setHasInk(false);
      hasInkRef.current = false;
    }
  }, [committedSignature]);

  const getCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasInk(true);
    hasInkRef.current = true;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (hasInkRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleClear = (e: MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    layoutCanvas();
    setHasInk(false);
    hasInkRef.current = false;
    onClear();
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <label
          className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider"
          htmlFor="waiver-signature-pad"
        >
          Client Signature <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="clear-signature-btn"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-lg transition cursor-pointer bg-white"
            aria-label="Clear signature"
          >
            <Eraser size={12} aria-hidden />
            Clear Signature
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative h-48 w-full rounded-lg overflow-hidden border-2 transition-colors ${
          error ? 'border-red-400' : 'border-neutral-300 focus-within:border-neutral-900'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block w-full h-full min-h-0 cursor-crosshair touch-none bg-white"
          id="waiver-signature-pad"
          role="img"
          aria-label="Draw your signature in this area"
        />
        {!hasInk && !committedSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-neutral-400 text-xs">Sign here with your finger or mouse</span>
          </div>
        )}
      </div>

      {committedSignature ? (
        <p className="text-[10px] text-emerald-700 font-medium" role="status">
          Signature saved automatically. Use Clear Signature to sign again.
        </p>
      ) : null}

      {error ? (
        <p className="text-xs font-semibold text-red-500" id="signature-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[10px] text-neutral-400 font-normal">
          Your signature is saved automatically when you finish each stroke.
        </p>
      )}
    </div>
  );
}
