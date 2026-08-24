import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gamepad2, Trophy, RotateCcw, Monitor } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function MiniGamesModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [activeGame, setActiveGame] = useState<'tictactoe' | 'rps' | 'clicker'>('tictactoe');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#2a2a2a] w-[600px] h-[500px] rounded-2xl shadow-2xl border border-zinc-700 flex flex-col overflow-hidden"
      >
        <div className="h-12 bg-[#202020] border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 text-zinc-300">
            <Gamepad2 size={18} className="text-indigo-400" />
            <span className="font-bold text-sm uppercase">Cloudy Arcade 🕹️</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-[#252525] border-r border-zinc-800 p-2 flex flex-col gap-2 shrink-0">
             <GameTab id="tictactoe" active={activeGame} setActive={setActiveGame} label="Jogo da Velha" icon={<Monitor size={16}/>} />
             <GameTab id="rps" active={activeGame} setActive={setActiveGame} label="Pedra, Papel..." icon={<Gamepad2 size={16}/>} />
             <GameTab id="clicker" active={activeGame} setActive={setActiveGame} label="Cloudy Clicker" icon={<Trophy size={16}/>} />
          </div>

          {/* Game Area */}
          <div className="flex-1 bg-[#1a1a1a] p-6 flex flex-col items-center justify-center overflow-auto relative">
            <AnimatePresence mode="wait">
              {activeGame === 'tictactoe' && <TicTacToe key="tictactoe" />}
              {activeGame === 'rps' && <RockPaperScissors key="rps" />}
              {activeGame === 'clicker' && <CloudyClicker key="clicker" />}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GameTab({ id, active, setActive, label, icon }: any) {
  return (
    <button 
      onClick={() => setActive(id)}
      className={twMerge(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
        active === id ? "bg-indigo-600 text-white shadow-md" : "text-zinc-400 hover:bg-[#303030] hover:text-white"
      )}
    >
      {icon} {label}
    </button>
  );
}

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const calculateWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every(s => s !== null);
  
  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
      <h2 className="text-xl font-bold text-white mb-6">Jogo da Velha</h2>
      <div className="grid grid-cols-3 gap-2 bg-zinc-800 p-2 rounded-xl">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-20 h-20 bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center text-4xl font-black text-white rounded-lg transition-colors border border-zinc-700/50"
          >
            <span className={cell === 'X' ? 'text-indigo-400' : 'text-emerald-400'}>
              {cell}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="text-lg font-bold text-zinc-300">
          {winner ? (
            <span className="text-green-400">🎉 Vencedor: {winner}!</span>
          ) : isDraw ? (
            <span className="text-yellow-400">Deu Velha! 🤝</span>
          ) : (
            <span>Vez do jogador: <span className={xIsNext ? 'text-indigo-400' : 'text-emerald-400'}>{xIsNext ? 'X' : 'O'}</span></span>
          )}
        </div>
        <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-bold transition-all">
          <RotateCcw size={16} /> Reiniciar
        </button>
      </div>
    </motion.div>
  );
}

function RockPaperScissors() {
  const [playerChoice, setPlayerChoice] = useState<string | null>(null);
  const [computerChoice, setComputerChoice] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const choices = [
    { id: 'rock', emoji: '🪨', label: 'Pedra' },
    { id: 'paper', emoji: '📄', label: 'Papel' },
    { id: 'scissors', emoji: '✂️', label: 'Tesoura' }
  ];

  const play = (choice: string) => {
    const computer = choices[Math.floor(Math.random() * choices.length)].id;
    setPlayerChoice(choice);
    setComputerChoice(computer);
    
    if (choice === computer) setResult('Empate!');
    else if (
      (choice === 'rock' && computer === 'scissors') ||
      (choice === 'paper' && computer === 'rock') ||
      (choice === 'scissors' && computer === 'paper')
    ) {
      setResult('Você Venceu! 🎉');
    } else {
      setResult('Você Perdeu! 😢');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm">
      <h2 className="text-xl font-bold text-white mb-8">Pedra, Papel ou Tesoura</h2>
      
      <div className="flex justify-center gap-4 w-full mb-8">
        {choices.map(c => (
          <button
            key={c.id}
            onClick={() => play(c.id)}
            className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700 hover:scale-105 active:scale-95"
          >
            <span className="text-4xl mb-2">{c.emoji}</span>
            <span className="text-xs font-bold text-zinc-300">{c.label}</span>
          </button>
        ))}
      </div>

      {playerChoice && computerChoice && (
        <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 w-full text-center flex flex-col items-center">
          <div className="flex items-center gap-6 text-3xl mb-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-zinc-400 mb-1">Você</span>
              {choices.find(c => c.id === playerChoice)?.emoji}
            </div>
            <span className="text-zinc-500 font-bold text-lg">VS</span>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-zinc-400 mb-1">CPU</span>
              {choices.find(c => c.id === computerChoice)?.emoji}
            </div>
          </div>
          <div className={twMerge(
            "text-xl font-black mt-2",
            result === 'Empate!' ? "text-yellow-400" : result === 'Você Venceu! 🎉' ? "text-green-400" : "text-red-400"
          )}>
            {result}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CloudyClicker() {
  const [score, setScore] = useState(0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
      <h2 className="text-xl font-bold text-white mb-2">Cloudy Clicker</h2>
      <p className="text-zinc-400 text-sm mb-8 text-center max-w-xs">Clique na nuvem o mais rápido que puder para aliviar o estresse!</p>
      
      <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-8">
        {score}
      </div>

      <button 
        onClick={() => setScore(s => s + 1)}
        className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-transform"
      >
        ☁️
      </button>

      {score > 0 && (
        <button 
          onClick={() => setScore(0)} 
          className="mt-12 text-zinc-500 hover:text-zinc-300 text-sm font-medium underline"
        >
          Zerar Pontuação
        </button>
      )}
    </motion.div>
  );
}
