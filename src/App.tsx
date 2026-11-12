/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TerminalPlatformer } from './components/TerminalPlatformer';
import { LevelEditor } from './components/LevelEditor';
import { Play, Volume2, VolumeX, Wrench, ArrowRight, HelpCircle } from 'lucide-react';
import { sound } from './audio/soundEngine';

export default function App() {
  const [gameState, setGameState] = useState<'START_MENU' | 'BRIEFING' | 'PLAYING' | 'LEVEL_CREATOR'>('START_MENU');
  const [isMuted, setIsMuted] = useState(false);

  const openBriefing = () => {
    sound.playKeyClick();
    sound.startAmbientDrone();
    setGameState('BRIEFING');
  };

  const beginLevelOne = () => {
    sound.playShiftTrigger();
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

  if (gameState === 'BRIEFING') {
    return (
      <div className="relative min-h-screen w-full bg-[#06080a] text-[#00FF66] font-mono flex flex-col items-center justify-center p-4 selection:bg-[#00FF66] selection:text-black">
        <div className="fixed inset-0 crt-overlay z-20 pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg bg-[#090d10] border border-[#00FF66]/40 rounded-lg p-6 sm:p-8 flex flex-col shadow-2xl terminal-box-glow">
          <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-3 mb-5">
            <span className="text-xs font-bold tracking-widest uppercase text-[#7EE787]">
              // HOW TO PLAY
            </span>
            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#00FF66] transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'MUTED' : 'AUDIO'}</span>
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-wider text-[#00FF66] terminal-glow mb-3">
            ONE GOAL. MANY SHIFTS.
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
            <p>
              In every level, you start on the left and must pass through the locked doorway on the right edge of the room.
            </p>
            <p>
              While the room interface looks familiar at first glance, <span className="text-[#00FF66] font-semibold">every single level requires a completely different interpretation of &ldquo;SHIFT&rdquo;</span> to open the way forward.
            </p>
            <p className="text-zinc-400 text-xs">
              Observe the subtle 2–3 word title at the top of each level and experiment freely. If you ever get stuck, click the <span className="text-[#00FF66] font-semibold">HINT</span> button in the top bar.
            </p>
          </div>

          {/* Controls Breakdown */}
          <div className="bg-[#050806] border border-[#00FF66]/30 rounded p-4 mb-6 space-y-2.5 text-xs">
            <div className="text-[11px] font-bold tracking-widest text-[#7EE787] uppercase mb-1">
              STANDARD CONTROLS
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">MOVE LEFT / RIGHT</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">A</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">D</kbd>
                <span className="text-zinc-500 mx-1">or</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">←</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">→</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">JUMP</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">W</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">SPACE</kbd>
                <span className="text-zinc-500 mx-1">or</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">↑</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">RESET ROOM</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">R</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">REVEAL HINT</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[#00FF66] rounded">
                <HelpCircle className="w-3 h-3" /> HINT BUTTON
              </span>
            </div>
          </div>

          <button
            onClick={beginLevelOne}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-black text-sm tracking-widest rounded transition-all transform active:scale-95 shadow-[0_0_20px_rgba(0,255,102,0.4)]"
          >
            <span>ENTER LEVEL 01</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
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
            onClick={openBriefing}
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
