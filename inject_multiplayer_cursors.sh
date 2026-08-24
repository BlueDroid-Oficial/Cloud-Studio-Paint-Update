#!/bin/bash
sed -i 's/{.*Background checkerboard for transparency.*}/<MultiplayerCursors activeCollaborationId={activeCollaborationId} user={user} zoom={zoom} \/>\n              {\/* Background checkerboard for transparency *\/}/g' src/components/CanvasArea.tsx
