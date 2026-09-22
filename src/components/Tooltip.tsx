import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  delay?: number;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delay = 150,
  className = '',
  containerClassName = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    // Detect if triggerRef wraps a single element child with its own bounding box (e.g. button, absolute/transformed element)
    const childEl = triggerRef.current.children.length === 1
      ? (triggerRef.current.firstElementChild as HTMLElement)
      : null;

    const targetEl = (childEl && (childEl.offsetWidth > 0 || childEl.offsetHeight > 0 || childEl.getClientRects().length > 0))
      ? childEl
      : triggerRef.current;

    const triggerRect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const padding = 8;
    const maxLeft = window.innerWidth - tooltipRect.width - padding;
    const maxTop = window.innerHeight - tooltipRect.height - padding;

    let actualSide = side;

    // Smart flipping if overflowing window boundary
    if (actualSide === 'left' && triggerRect.left - tooltipRect.width - sideOffset < padding) {
      if (triggerRect.right + tooltipRect.width + sideOffset <= window.innerWidth - padding) {
        actualSide = 'right';
      }
    } else if (actualSide === 'right' && triggerRect.right + tooltipRect.width + sideOffset > window.innerWidth - padding) {
      if (triggerRect.left - tooltipRect.width - sideOffset >= padding) {
        actualSide = 'left';
      }
    } else if (actualSide === 'top' && triggerRect.top - tooltipRect.height - sideOffset < padding) {
      if (triggerRect.bottom + tooltipRect.height + sideOffset <= window.innerHeight - padding) {
        actualSide = 'bottom';
      }
    } else if (actualSide === 'bottom' && triggerRect.bottom + tooltipRect.height + sideOffset > window.innerHeight - padding) {
      if (triggerRect.top - tooltipRect.height - sideOffset >= padding) {
        actualSide = 'top';
      }
    }

    let top = 0;
    let left = 0;

    // Calculate base position based on actualSide
    if (actualSide === 'top') {
      top = triggerRect.top - tooltipRect.height - sideOffset;
    } else if (actualSide === 'bottom') {
      top = triggerRect.bottom + sideOffset;
    } else if (actualSide === 'left') {
      left = triggerRect.left - tooltipRect.width - sideOffset;
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    } else if (actualSide === 'right') {
      left = triggerRect.right + sideOffset;
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    }

    // Align for top/bottom
    if (actualSide === 'top' || actualSide === 'bottom') {
      if (align === 'center') {
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      } else if (align === 'start') {
        left = triggerRect.left;
      } else if (align === 'end') {
        left = triggerRect.right - tooltipRect.width;
      }
    }

    // Align for left/right
    if (actualSide === 'left' || actualSide === 'right') {
      if (align === 'start') {
        top = triggerRect.top;
      } else if (align === 'end') {
        top = triggerRect.bottom - tooltipRect.height;
      }
    }

    // Viewport Boundary Clamping (prevent overflow outside screen)
    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    setCoords({ top, left });
    setIsPositioned(true);
  }, [side, align, sideOffset]);

  const show = () => {
    if (disabled || !content) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
    setIsPositioned(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      const handleScrollOrResize = () => {
        calculatePosition();
      };
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      };
    } else {
      setIsPositioned(false);
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex items-center ${containerClassName}`}
      >
        {children}
      </span>

      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              visibility: isPositioned ? 'visible' : 'hidden',
            }}
            className={`pointer-events-none w-max max-w-[280px] bg-zinc-950/95 text-zinc-200 border border-zinc-800/90 rounded-lg px-3 py-1.5 text-[11px] font-normal leading-relaxed shadow-2xl shadow-black/80 backdrop-blur-md ${isPositioned ? 'animate-fade-slide-up' : ''} select-none break-words ${className}`}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};

export interface InfoTooltipProps {
  content: React.ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  iconClassName?: string;
  containerClassName?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  side = 'top',
  align = 'center',
  iconClassName = 'w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors',
  containerClassName = '',
  className = '',
}) => {
  return (
    <Tooltip
      content={content}
      side={side}
      align={align}
      containerClassName={containerClassName}
      className={className}
    >
      <Info className={`cursor-help ${iconClassName}`} />
    </Tooltip>
  );
};

export default Tooltip;
