import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, RefreshCw, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidingPuzzle } from './SlidingPuzzle';

const SHAPES = [
  { name: 'Círculo', draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.arc(w/2, h/2, 50, 0, Math.PI*2); } },
  { name: 'Quadrado', draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.rect(w/2 - 50, h/2 - 50, 100, 100); } },
  { name: 'Triângulo', draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => { ctx.moveTo(w/2, h/2 - 50); ctx.lineTo(w/2 + 50, h/2 + 50); ctx.lineTo(w/2 - 50, h/2 + 50); ctx.closePath(); } }
];

export function GameModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addGamePoints, increaseCloudSpace, setNotification } = useStore();
  const [round, setRound] = useState(1);
  const [points, setPoints] = useState(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'score'>('intro');
  const [gameType, setGameType] = useState<'shape' | 'clicker' | 'puzzle'>('shape');
  const [currentShape, setCurrentShape] = useState(0);
  const [score, setScore] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    if (gameState === 'playing' && gameType === 'clicker') {
      const interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(interval);
            setScore(clicks * 10);
            setPoints(p => p + (clicks * 10));
            setGameState('score');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, gameType, clicks]);

  useEffect(() => {
    if (gameState === 'playing' && canvasRef.current && targetCanvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const tCtx = targetCanvasRef.current.getContext('2d');
      if (!ctx || !tCtx) return;

      // Clear both
      ctx.clearRect(0, 0, 256, 160);
      tCtx.clearRect(0, 0, 256, 160);

      // Draw target
      tCtx.beginPath();
      SHAPES[currentShape].draw(tCtx, 256, 160);
      tCtx.strokeStyle = 'rgba(99, 102, 241, 0.3)'; // faint indigo
      tCtx.lineWidth = 15;
      tCtx.lineCap = 'round';
      tCtx.lineJoin = 'round';
      tCtx.stroke();
    }
  }, [gameState, currentShape]);

  const startRound = (type: 'shape' | 'clicker' | 'puzzle') => {
    setGameType(type);
    if (type === 'shape') {
      setCurrentShape(Math.floor(Math.random() * SHAPES.length));
    } else if (type === 'clicker') {
      setClicks(0);
      setTimer(5);
    } else {
        setPuzzleSolved(false);
    }
    setGameState('playing');
  };

  const evaluateScore = () => {
    if (gameType === 'clicker') {
        setScore(clicks * 10);
        setPoints(p => p + (clicks * 10));
        setGameState('score');
        return;
    }
    if (!canvasRef.current || !targetCanvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const tCtx = targetCanvasRef.current.getContext('2d');
    if (!ctx || !tCtx) return;

    const imgData = ctx.getImageData(0, 0, 256, 160).data;
    const tImgData = tCtx.getImageData(0, 0, 256, 160).data;

    let hit = 0;
    let miss = 0;
    let totalTarget = 0;

    for (let i = 3; i < imgData.length; i += 4) {
      const drawn = imgData[i] > 50;
      const target = tImgData[i] > 50;
      
      if (target) totalTarget++;
      if (drawn && target) hit++;
      if (drawn && !target) miss++;
    }

    let calculatedScore = 0;
    if (totalTarget > 0) {
      const accuracy = hit / totalTarget;
      const penalty = miss / totalTarget;
      calculatedScore = Math.max(0, Math.min(100, Math.floor((accuracy - penalty * 0.5) * 100)));
    }
    
    setScore(calculatedScore);
    setPoints(p => p + calculatedScore);
    setGameState('score');
  };

  const nextRound = () => {
    if (round < 3) {
      setRound(r => r + 1);
      if (gameType === 'shape') {
        startRound('shape');
      } else {
        startRound('clicker');
      }
    } else {
      addGamePoints(points);
      if (points >= 200) {
        increaseCloudSpace(10);
        setNotification({ message: 'Você ganhou +10MB de espaço na nuvem!', type: 'success' });
      }
      onClose();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
      <div className="bg-[#1f1f1f] border border-zinc-700 w-full max-w-sm rounded-2xl p-6 text-white text-center relative overflow-hidden shadow-2xl">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10">
            <X size={20} />
        </button>

        <h2 className="text-xl font-black mb-1 flex items-center justify-center gap-2 text-indigo-400 uppercase tracking-wider">
            <Trophy className="text-yellow-500" />
            Minijogo de Traço
        </h2>
        <p className="text-xs text-zinc-400 mb-6 font-bold uppercase">Rodada {round} de 3 • Pontos: {points}</p>
        
        <AnimatePresence mode="wait">
          {gameState === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-500 text-indigo-400">
                <Play size={32} />
              </div>
              <h3 className="text-lg font-bold mb-6">Escolha um Jogo!</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => startRound('shape')}
                    className="py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500"
                >
                    Traço
                </button>
                <button 
                    onClick={() => startRound('clicker')}
                    className="py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500"
                >
                    Clicker
                </button>
                <button 
                    onClick={() => startRound('puzzle')}
                    className="col-span-2 py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500"
                >
                    Puzzle
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && gameType === 'shape' && (
            <motion.div key="playing-shape" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm font-bold text-yellow-400 mb-3 animate-pulse">
                Desenhe a forma: {SHAPES[currentShape].name}
              </p>
              
              <div className="relative w-[256px] h-[160px] mx-auto bg-black rounded-lg mb-6 border-2 border-dashed border-zinc-600 cursor-crosshair overflow-hidden touch-none">
                <canvas
                  ref={targetCanvasRef}
                  width={256}
                  height={160}
                  className="absolute inset-0 pointer-events-none"
                />
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={160}
                  className="absolute inset-0"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>

              <button 
                  onClick={evaluateScore}
                  className="w-full py-3 bg-emerald-600 rounded-lg font-bold hover:bg-emerald-500 transition-colors"
              >
                  AVALIAR TRAÇO
              </button>
            </motion.div>
          )}

          {gameState === 'playing' && gameType === 'clicker' && (
            <motion.div key="playing-clicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10">
                <div className="text-sm font-bold text-zinc-400 mb-4">Tempo: {timer}s</div>
                <button 
                    onClick={() => setClicks(c => c + 1)} 
                    className="w-32 h-32 bg-indigo-500 rounded-full text-4xl font-black text-white hover:bg-indigo-400 shadow-2xl active:scale-95 transition-transform mx-auto mb-6"
                >
                    {clicks}
                </button>
                <button 
                    onClick={evaluateScore}
                    className="w-full py-3 bg-emerald-600 rounded-lg font-bold hover:bg-emerald-500 transition-colors"
                >
                    FINALIZAR
                </button>
            </motion.div>
          )}

          {gameState === 'playing' && gameType === 'puzzle' && (
            <motion.div key="playing-puzzle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6">
                <SlidingPuzzle imageSrc="" onWin={() => {
                    setScore(100);
                    setPoints(p => p + 100);
                    setGameState('score');
                }} />
            </motion.div>
          )}

          {gameState === 'score' && (
            <motion.div key="score" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="py-6">
              <div className="text-5xl font-black mb-2 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {score}%
              </div>
              <p className="text-sm font-bold text-zinc-400 mb-6 uppercase">Precisão</p>
              
              <button 
                onClick={nextRound}
                className="w-full py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 transition-all"
              >
                {round < 3 ? "PRÓXIMA RODADA" : "RESGATAR PONTOS"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
