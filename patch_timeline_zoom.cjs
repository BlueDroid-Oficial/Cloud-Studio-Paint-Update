const fs = require('fs');
let code = fs.readFileSync('src/components/Timeline.tsx', 'utf-8');

code = code.replace(
  "  const frameWidth = 14;",
  "  const [frameWidth, setFrameWidth] = useState(14);\n  const timelineBodyRef = useRef<HTMLDivElement>(null);"
);

code = code.replace(
  "import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';",
  "import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';"
);

// Add wheel/pinch handler to timeline body
code = code.replace(
  "{/* Timeline Grid (Right side) */}",
  `{/* Timeline Grid (Right side) */}
        <div 
          ref={timelineBodyRef}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setFrameWidth(prev => Math.max(4, Math.min(60, prev - Math.sign(e.deltaY) * 2)));
            }
          }}
          className="flex-1 flex flex-col overflow-x-auto relative scroll-smooth scrollbar-thin scrollbar-track-[#1a1a1a] scrollbar-thumb-zinc-700"
          onScroll={handleScroll}
        >`
);

code = code.replace(
  "className=\"flex-1 flex flex-col overflow-x-auto relative scroll-smooth scrollbar-thin scrollbar-track-[#1a1a1a] scrollbar-thumb-zinc-700\"",
  ""
);

code = code.replace(
  "onScroll={handleScroll}",
  ""
);
// Oops, let's just do standard replace properly.
