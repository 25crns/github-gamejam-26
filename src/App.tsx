/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TerminalPlatformer } from './components/TerminalPlatformer';
import { LevelEditor } from './components/LevelEditor';
import { Play, Volume2, VolumeX, Wrench } from 'lucide-react';
import { sound } from './audio/soundEngine';

export default function App() {
  const [gameState, setGameState] = useState<'START_MENU' | 'PLAYING' | 'LEVEL_CREATOR'>('START_MENU');
  const [isMuted, setIsMuted] = useState(false);

  const startGame = () => {
    sound.playKeyClick();
    sound.startAmbientDrone();
    setGameState('PLAYING');
  };

  const openEditor = () => {
    sound.playKeyClick();
    setGameState('LEVEL_CREATOR');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  if (gameState === 'PLAYING') {
    return (
      <TerminalPlatformer
        onBackToTitle={() => setGameState('START_MENU')}
        onOpenEditor={openEditor}
      />
    );
  }

  if (gameState === 'LEVEL_CREATOR') {
    return (
      <LevelEditor
        onBack={() => setGameState('START_MENU')}
        onPlayLevel={() => setGameState('PLAYING')}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#06080a] text-[#00FF66] font-mono flex flex-col items-center justify-center p-4 selection:bg-[#00FF66] selection:text-black">
      {/* CRT Scanline and flicker overlay */}
      <div className="fixed inset-0 crt-overlay z-20 pointer-events-none" />

      {/* Main Terminal Title Box */}
      <div className="relative z-10 w-full max-w-lg bg-[#090d10] border border-[#00FF66]/30 rounded-lg p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl terminal-box-glow">
        {/* Top Sound Control */}
        <div className="flex items-center justify-end w-full border-b border-[#00FF66]/20 pb-3 mb-6 text-xs text-zinc-500">
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#00FF66] transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'MUTED' : 'AUDIO'}</span>
          </button>
        </div>

        {/* ASCII Logo */}
        <pre className="text-2xl sm:text-3xl font-black text-[#00FF66] terminal-glow tracking-widest leading-none my-2 select-none">
{`   _____ __  _____________
  / ___// / / /  _/ ____/ /_
  \\__ \\/ /_/ // // /_  / __/
 ___/ / __  // // __/ / /_  
/____/_/ /_/___/_/    \\__/  `}
        </pre>

        <p className="text-xs uppercase tracking-widest text-[#7EE787] mt-3 mb-8 font-semibold">
          A Minimalist Puzzle Platformer
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full sm:w-64">
          <button
            onClick={startGame}
            className="group relative inline-flex items-center justify-center gap-3 w-full py-3 px-6 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-black text-sm tracking-widest rounded transition-all transform active:scale-95 shadow-[0_0_20px_rgba(0,255,102,0.4)]"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>START GAME</span>
          </button>

          <button
            onClick={openEditor}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-zinc-900 border border-[#00FF66]/40 hover:bg-[#00FF66]/15 hover:border-[#00FF66] text-[#00FF66] font-bold text-xs tracking-wider rounded transition-all"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>LEVEL CREATOR</span>
          </button>
        </div>

        {/* Quick Controls Legend */}
        <div className="mt-8 pt-4 border-t border-[#00FF66]/20 w-full flex items-center justify-center text-[11px] text-zinc-500 gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">MOVE:</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">W</kbd>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">D</kbd>
            <span>/</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">ARROWS</kbd>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">JUMP:</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">SPACE</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
