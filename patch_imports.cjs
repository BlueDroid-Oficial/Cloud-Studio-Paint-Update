const fs = require('fs');
let code = fs.readFileSync('src/components/SimpleTimeline.tsx', 'utf-8');

const imports = "import { ChevronLeft, ChevronRight, Plus, Clock, Fingerprint, X, Copy, Trash2, Zap, Settings2, RefreshCcw, ArrowRight, ArrowLeft, Trash, Shuffle, PlayCircle } from 'lucide-react';";
code = code.replace(/import \{ ChevronLeft, [^}]*\} from 'lucide-react';/, imports);

fs.writeFileSync('src/components/SimpleTimeline.tsx', code);
