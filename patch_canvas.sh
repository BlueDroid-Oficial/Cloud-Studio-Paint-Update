#!/bin/bash

# Insert MultiplayerCursors component before CanvasArea
sed -i '/export function CanvasArea()/i \
import { motion } from "motion/react";\
\
const MultiplayerCursors = ({ activeCollaborationId, user, zoom }: any) => {\
  const [cursors, setCursors] = useState<any[]>([]);\
  \
  useEffect(() => {\
    if (!activeCollaborationId || !user) return;\
    const q = query(collection(db, `collaborations/${activeCollaborationId}/cursors`));\
    const unsubscribe = onSnapshot(q, (snapshot) => {\
      const updatedCursors: any[] = [];\
      const now = Date.now();\
      snapshot.forEach((doc) => {\
        const data = doc.data();\
        if (data.uid !== user.uid) {\
          if (data.timestamp && now - data.timestamp.toMillis() < 30000) {\
            updatedCursors.push(data);\
          }\
        }\
      });\
      setCursors(updatedCursors);\
    });\
    return () => unsubscribe();\
  }, [activeCollaborationId, user]);\
\
  return (\
    <>\
      {cursors.map((cursor) => (\
        <motion.div\
          key={cursor.uid}\
          className="absolute z-50 pointer-events-none flex flex-col items-start origin-top-left"\
          initial={false}\
          animate={{ x: cursor.x, y: cursor.y }}\
          transition={{ type: "spring", damping: 20, stiffness: 200, mass: 0.5 }}\
        >\
          {cursor.tool !== "eraser" && cursor.tool !== "move" && (\
            <div \
               className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white mix-blend-difference"\
               style={{ width: cursor.size, height: cursor.size, backgroundColor: cursor.color, opacity: 0.8 }}\
            />\
          )}\
          <div className="text-white relative z-10" style={{ transform: `scale(${100/zoom})`, transformOrigin: "top left" }}>\
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill={cursor.color || "#3b82f6"} stroke="white" strokeWidth="1.5"/>\
             </svg>\
             <div className="bg-zinc-800/90 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-zinc-600">\
               {cursor.name}\
             </div>\
          </div>\
        </motion.div>\
      ))}\
    </>\
  );\
};\
' src/components/CanvasArea.tsx

# Add ref for lastCursorUpdate
sed -i 's/const fileInputRef = useRef<HTMLInputElement>(null);/const fileInputRef = useRef<HTMLInputElement>(null);\n  const lastCursorUpdateRef = useRef<number>(0);/g' src/components/CanvasArea.tsx

# Add throttle in handlePointerMove
# find handlePointerMove, add throttle code at the end
# actually, it's easier to inject inside handlePointerMove right after coordinates calculation
