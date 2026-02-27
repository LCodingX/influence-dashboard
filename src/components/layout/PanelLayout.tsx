import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PanelLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  bottomPanel?: ReactNode;
}

const MIN_PANEL_WIDTH_PERCENT = 25;
const MAX_PANEL_WIDTH_PERCENT = 75;
const DEFAULT_SPLIT_PERCENT = 50;
const BOTTOM_PANEL_MIN_HEIGHT = 200;
const BOTTOM_PANEL_DEFAULT_HEIGHT = 300;

export function PanelLayout({
  leftPanel,
  rightPanel,
  bottomPanel,
}: PanelLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [bottomExpanded, setBottomExpanded] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(BOTTOM_PANEL_DEFAULT_HEIGHT);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleVerticalMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingVertical(true);
    },
    []
  );

  const handleBottomMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingBottom(true);
    },
    []
  );

  useEffect(() => {
    if (!isDraggingVertical && !isDraggingBottom) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isDraggingVertical) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        const clamped = Math.min(
          MAX_PANEL_WIDTH_PERCENT,
          Math.max(MIN_PANEL_WIDTH_PERCENT, percent)
        );
        setSplitPercent(clamped);
      }

      if (isDraggingBottom) {
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const newHeight = rect.height - y;
        const clamped = Math.max(
          BOTTOM_PANEL_MIN_HEIGHT,
          Math.min(rect.height * 0.6, newHeight)
        );
        setBottomHeight(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingVertical(false);
      setIsDraggingBottom(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingVertical, isDraggingBottom]);

  return (
    <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
      <div
        className="flex flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Left Panel */}
        <div
          className="overflow-auto"
          style={{ width: `${splitPercent}%`, minWidth: 0 }}
        >
          <div className="h-full p-4">{leftPanel}</div>
        </div>

        {/* Vertical Divider */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleVerticalMouseDown}
          className={[
            'relative flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center',
            'transition-colors duration-150',
            isDraggingVertical ? 'bg-blue-500' : 'bg-navy-700 hover:bg-blue-500/50',
          ].join(' ')}
        >
          <div className="absolute h-8 w-3 rounded-full" />
        </div>

        {/* Right Panel */}
        <div
          className="overflow-auto"
          style={{ width: `${100 - splitPercent}%`, minWidth: 0 }}
        >
          <div className="h-full p-4">{rightPanel}</div>
        </div>
      </div>

      {/* Bottom Panel */}
      {bottomPanel && (
        <>
          {/* Bottom Panel Toggle / Horizontal Divider */}
          <div
            className={[
              'flex flex-shrink-0 items-center border-t border-navy-700 bg-navy-800',
              bottomExpanded ? 'cursor-row-resize' : '',
            ].join(' ')}
          >
            {bottomExpanded && (
              <div
                role="separator"
                aria-orientation="horizontal"
                onMouseDown={handleBottomMouseDown}
                className={[
                  'absolute left-0 right-0 h-1 cursor-row-resize',
                  isDraggingBottom
                    ? 'bg-blue-500'
                    : 'bg-navy-700 hover:bg-blue-500/50',
                ].join(' ')}
              />
            )}
            <button
              type="button"
              onClick={() => setBottomExpanded((prev) => !prev)}
              className="flex w-full items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-50"
            >
              {bottomExpanded ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Collapse influence panel
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Expand influence panel
                </>
              )}
            </button>
          </div>

          {bottomExpanded && (
            <div
              className="flex-shrink-0 overflow-auto bg-navy-900"
              style={{ height: bottomHeight }}
            >
              <div className="h-full p-4">{bottomPanel}</div>
            </div>
          )}
        </>
      )}

      {/* Drag overlay to prevent text selection while dragging */}
      {(isDraggingVertical || isDraggingBottom) && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
}
