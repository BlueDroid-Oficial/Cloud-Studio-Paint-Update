#!/bin/bash
sed -i 's/style={{ x: pos.x, y: pos.y }}/animate={{ x: pos.x, y: pos.y }} transition={{ type: "spring", bounce: 0, duration: 0.2 }} initial={false}/g' src/App.tsx
