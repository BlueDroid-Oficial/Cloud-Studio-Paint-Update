#!/bin/bash
sed -i 's/  const containerRef = useRef<HTMLDivElement>(null);/  const containerRef = useRef<HTMLDivElement>(null);\n  const lastCursorUpdateRef = useRef<number>(0);/g' src/components/CanvasArea.tsx
