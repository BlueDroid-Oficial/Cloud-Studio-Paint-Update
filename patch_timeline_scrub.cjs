const fs = require('fs');
let code = fs.readFileSync('src/components/Timeline.tsx', 'utf-8');

code = code.replace(
  "const [frameWidth, setFrameWidth] = useState(14);\n  const timelineBodyRef = useRef<HTMLDivElement>(null);",
  `const [frameWidth, setFrameWidth] = useState(14);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const touchZoomRef = useRef<{ dist: number, baseWidth: number } | null>(null);`
);

code = code.replace(
  "  const handleFrameClick = (frame: number) => {",
  `  const handlePointerDownRuler = (e: React.PointerEvent, frame: number) => {
    isScrubbingRef.current = true;
    handleFrameClick(frame);
    const handler = (ev: PointerEvent) => {
      if (isScrubbingRef.current && timelineBodyRef.current) {
        const rect = timelineBodyRef.current.getBoundingClientRect();
        const scrollLeft = timelineBodyRef.current.scrollLeft;
        const x = ev.clientX - rect.left + scrollLeft - 200; // 200 is sidebar width
        const frame = Math.max(1, Math.min(totalFrames, Math.floor(x / frameWidth) + 1));
        handleFrameClick(frame);
      }
    };
    const upHandler = () => {
      isScrubbingRef.current = false;
      window.removeEventListener('pointermove', handler);
      window.removeEventListener('pointerup', upHandler);
    };
    window.addEventListener('pointermove', handler);
    window.addEventListener('pointerup', upHandler);
  };

  const handleFrameClick = (frame: number) => {`
);

code = code.replace(
  "onClick={() => handleFrameClick(i + 1)}",
  "onPointerDown={(e) => handlePointerDownRuler(e, i + 1)}"
);

code = code.replace(
  "onWheel={(e) => {",
  `onTouchStart={(e) => {
            if (e.touches.length === 2) {
              e.preventDefault();
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              touchZoomRef.current = { dist, baseWidth: frameWidth };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && touchZoomRef.current) {
              e.preventDefault();
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              const scale = dist / touchZoomRef.current.dist;
              setFrameWidth(Math.max(4, Math.min(60, touchZoomRef.current.baseWidth * scale)));
            }
          }}
          onTouchEnd={() => { touchZoomRef.current = null; }}
          onWheel={(e) => {`
);

fs.writeFileSync('src/components/Timeline.tsx', code);
