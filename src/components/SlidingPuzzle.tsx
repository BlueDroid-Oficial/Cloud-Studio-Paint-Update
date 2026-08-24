import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SlidingPuzzleProps {
  imageSrc: string;
  onWin: () => void;
}

export function SlidingPuzzle({ imageSrc, onWin }: SlidingPuzzleProps) {
  const size = 3;
  const [tiles, setTiles] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const initialTiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
    initialTiles.push(0); // 0 is empty
    setTiles(shuffle(initialTiles));
  }, []);

  const shuffle = (tiles: number[]) => {
    let array = [...tiles];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleTileClick = (index: number) => {
    if (solved) return;
    const emptyIndex = tiles.indexOf(0);
    const neighbors = [index - 1, index + 1, index - size, index + size];
    
    if (neighbors.includes(emptyIndex) && (
      (index % size !== 0 || emptyIndex !== index - 1) &&
      (index % size !== size - 1 || emptyIndex !== index + 1)
    )) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      
      if (newTiles.every((tile, i) => i === size * size - 1 || tile === i + 1)) {
        setSolved(true);
        onWin();
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1 w-64 h-64 mx-auto">
      {tiles.map((tile, index) => (
        <div
          key={index}
          onClick={() => handleTileClick(index)}
          className={`w-20 h-20 ${tile === 0 ? 'bg-zinc-900' : 'bg-indigo-500'} flex items-center justify-center text-2xl font-bold rounded ${tile !== 0 ? 'cursor-pointer' : ''}`}
        >
          {tile !== 0 && tile}
        </div>
      ))}
    </div>
  );
}
