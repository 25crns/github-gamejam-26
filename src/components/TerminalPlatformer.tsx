import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LevelData, Platform, Spike, DoorWall, Player } from '../game/types';
import { getLevelData } from '../game/levels';
import { updatePlayer, InputState } from '../game/physics';
import { sound } from '../audio/soundEngine';
import { Volume2, VolumeX, RotateCcw, CheckCircle2 } from 'lucide-react';

interface TerminalPlatformerProps {
  onBackToTitle?: () => void;
  onOpenEditor?: () => void;
  initialLevelId?: number;
}

export const TerminalPlatformer: React.FC<TerminalPlatformerProps> = ({
  onBackToTitle,
  onOpenEditor,
  initialLevelId = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game States
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(initialLevelId);
  const [levelData, setLevelData] = useState<LevelData>(() => getLevelData(initialLevelId));
  const [isWon, setIsWon] = useState<boolean>(false);
  const [allLevelsCompleted, setAllLevelsCompleted] = useState<boolean>(false);
  const [deaths, setDeaths] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [startTime] = useState<number>(() => Date.now());
  const [finalTime, setFinalTime] = useState<number>(0);

  // Mutable Game References for High-Performance Canvas Loop (60 FPS)
  const playerRef = useRef<Player>({
    x: 50,
    y: 320,
    width: 20,
    height: 24,
    vx: 0,
    vy: 0,
    isGrounded: false,
    facing: 'right',
    isDead: false,
    respawnTimer: 0,
  });

  const platformsRef = useRef<Platform[]>([]);
  const spikesRef = useRef<Spike[]>([]);
  const doorRef = useRef<DoorWall>({
    x: 785,
    y: 280,
    height: 90,
    isOpen: false,
  });

  const inputsRef = useRef<InputState>({
    left: false,
    right: false,
    jump: false,
    shift: false,
  });

  // Mouse Dragging State for Level 2 (Shiftable parts)
  const draggingItemRef = useRef<{
    type: 'platform' | 'spike';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Particles for jumps, landing, and shift activation
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }>>([]);

  // Initialize or reset a level
  const loadLevel = useCallback((lvlNum: number) => {
    const data = getLevelData(lvlNum);
    setLevelData(data);
    setCurrentLevelNum(lvlNum);
    setIsWon(false);
    setTransitioning(false);

    // Reset player
    playerRef.current = {
      x: data.playerStart.x,
      y: data.playerStart.y,
      width: 20,
      height: 24,
      vx: 0,
      vy: 0,
      isGrounded: false,
      facing: 'right',
      isDead: false,
      respawnTimer: 0,
    };

    // Deep clone platforms and spikes
    platformsRef.current = data.platforms.map((p) => ({ ...p, isShifted: false }));
    spikesRef.current = data.spikes.map((s) => ({ ...s, isShifted: false }));
    doorRef.current = { ...data.door, isOpen: false };

    // Ambient tone adjustment
    sound.shiftAmbientPitch(1 + (lvlNum - 1) * 0.25);
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadLevel(initialLevelId);
    sound.startAmbientDrone();
  }, [loadLevel, initialLevelId]);

  // Open Door helper
  const unlockDoor = useCallback(() => {
    if (!doorRef.current.isOpen) {
      doorRef.current.isOpen = true;
      sound.playShiftTrigger();
      sound.playDoorOpen();

      // Emit particles along the dotted door segment
      const doorX = doorRef.current.x;
      const doorY = doorRef.current.y;
      const doorH = doorRef.current.height;
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: doorX,
          y: doorY + Math.random() * doorH,
          vx: (Math.random() - 1) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 25,
          maxLife: 25,
          color: '#00FF66',
          size: 2.5,
        });
      }
    }
  }, []);

  // --- LEVEL 1: SHIFT KEY TRIGGER ---
  const handleShiftKeyPress = useCallback(() => {
    if (currentLevelNum === 1) {
      unlockDoor();
    }
  }, [currentLevelNum, unlockDoor]);

  // --- LEVEL 3: BROWSER TAB SWITCH DETECTION ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentLevelNum === 3) {
        unlockDoor();
      }
    };

    const handleWindowBlur = () => {
      if (currentLevelNum === 3) {
        unlockDoor();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [currentLevelNum, unlockDoor]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // W / A / D / Arrow Keys
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        inputsRef.current.left = true;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        inputsRef.current.right = true;
      }
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
        inputsRef.current.jump = true;
      }

      // Shift key
      if (e.key === 'Shift') {
        inputsRef.current.shift = true;
        handleShiftKeyPress();
      }

      // R: Quick Restart
      if (e.key === 'r' || e.key === 'R') {
        sound.playKeyClick();
        loadLevel(currentLevelNum);
      }

      // M: Mute
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        inputsRef.current.left = false;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        inputsRef.current.right = false;
      }
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
        inputsRef.current.jump = false;
      }
      if (e.key === 'Shift') {
        inputsRef.current.shift = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentLevelNum, handleShiftKeyPress, loadLevel]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  // --- MOUSE INTERACTIONS (FOR LEVEL 2 GEOMETRY SHIFT) ---
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.x) * scaleX,
      y: (e.clientY - rect.y) * scaleY,
    };
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentLevelNum !== 2) return;
    const { x, y } = getCanvasMousePos(e);

    let shiftedSomething = false;

    // Check platforms
    for (const p of platformsRef.current) {
      if (p.isShiftable && x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        p.isShifted = !p.isShifted;
        if (p.id === 'platform-mid-1') {
          p.x = p.isShifted ? p.originalX + 110 : p.originalX;
          p.y = p.isShifted ? p.originalY - 40 : p.originalY;
        } else if (p.id === 'platform-mid-2') {
          p.x = p.isShifted ? p.originalX + 60 : p.originalX;
          p.y = p.isShifted ? p.originalY + 60 : p.originalY;
        } else if (p.id === 'ground-left') {
          p.width = p.isShifted ? 260 : 200;
        }
        shiftedSomething = true;
        break;
      }
    }

    // Check spikes (shift them down into the void)
    if (!shiftedSomething) {
      for (const s of spikesRef.current) {
        if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
          s.isShifted = !s.isShifted;
          s.y = s.isShifted ? s.originalY + 80 : s.originalY;
          shiftedSomething = true;
          break;
        }
      }
    }

    if (shiftedSomething) {
      unlockDoor();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentLevelNum !== 2) return;
    const { x, y } = getCanvasMousePos(e);

    // Check platforms
    for (const p of platformsRef.current) {
      if (p.isShiftable && x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        draggingItemRef.current = {
          type: 'platform',
          id: p.id,
          offsetX: x - p.x,
          offsetY: y - p.y,
        };
        sound.playKeyClick();
        return;
      }
    }

    // Check spikes
    for (const s of spikesRef.current) {
      if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
        draggingItemRef.current = {
          type: 'spike',
          id: s.id,
          offsetX: x - s.x,
          offsetY: y - s.y,
        };
        sound.playKeyClick();
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingItemRef.current || currentLevelNum !== 2) return;
    const { x, y } = getCanvasMousePos(e);
    const drag = draggingItemRef.current;

    if (drag.type === 'platform') {
      const p = platformsRef.current.find((item) => item.id === drag.id);
      if (p) {
        p.x = Math.max(0, Math.min(780 - p.width, x - drag.offsetX));
        p.y = Math.max(50, Math.min(420 - p.height, y - drag.offsetY));
      }
    } else if (drag.type === 'spike') {
      const s = spikesRef.current.find((item) => item.id === drag.id);
      if (s) {
        s.x = Math.max(0, Math.min(780 - s.width, x - drag.offsetX));
        s.y = Math.max(50, Math.min(440 - s.height, y - drag.offsetY));
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingItemRef.current) {
      sound.playLand();
      draggingItemRef.current = null;
      unlockDoor();
    }
  };

  // Next level sequence
  const handleLevelWin = useCallback(() => {
    setIsWon(true);
    setTransitioning(true);

    setTimeout(() => {
      if (currentLevelNum < 3) {
        loadLevel(currentLevelNum + 1);
      } else {
        setAllLevelsCompleted(true);
        setFinalTime(Math.round((Date.now() - startTime) / 1000));
      }
    }, 1000);
  }, [currentLevelNum, loadLevel, startTime]);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // 1. Update Physics
      if (!isWon && !transitioning && !allLevelsCompleted) {
        updatePlayer(
          playerRef.current,
          inputsRef.current,
          platformsRef.current,
          spikesRef.current,
          doorRef.current,
          undefined,
          () => {
            // On Death
            setDeaths((d) => d + 1);
            playerRef.current.x = levelData.playerStart.x;
            playerRef.current.y = levelData.playerStart.y;
            playerRef.current.vx = 0;
            playerRef.current.vy = 0;
          },
          () => {
            // On Win
            handleLevelWin();
          }
        );
      }

      // 2. Render Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background CRT Grid
      ctx.fillStyle = '#06090a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 255, 102, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Platforms (Clean, without text/labels)
      for (const plat of platformsRef.current) {
        ctx.save();
        ctx.fillStyle = '#0b1610';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Internal diagonal grid pattern
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.15)';
        ctx.lineWidth = 1;
        for (let ix = plat.x + 8; ix < plat.x + plat.width; ix += 14) {
          ctx.beginPath();
          ctx.moveTo(ix, plat.y);
          ctx.lineTo(Math.min(plat.x + plat.width, ix + 10), plat.y + plat.height);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Spikes
      for (const spike of spikesRef.current) {
        ctx.save();
        const toothWidth = spike.width / spike.count;
        ctx.fillStyle = '#2a0a0e';
        ctx.strokeStyle = '#FF3344';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < spike.count; i++) {
          const sx = spike.x + i * toothWidth;
          const sy = spike.y + spike.height;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + toothWidth / 2, spike.y);
          ctx.lineTo(sx + toothWidth, sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Vertical Wall & Dotted Door along Right Edge
      const door = doorRef.current;
      const wallX = door.x;
      ctx.save();
      ctx.lineWidth = 2;

      // 1. Solid wall above the door gap
      ctx.strokeStyle = '#00FF66';
      ctx.beginPath();
      ctx.moveTo(wallX, 0);
      ctx.lineTo(wallX, door.y);
      ctx.stroke();

      // 2. Door segment along the vertical wall
      if (door.isOpen) {
        // Unlocked door: rendered as a vibrant dotted line
        ctx.save();
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]); // DOTTED LINE
        ctx.shadowColor = '#00FF66';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(wallX, door.y);
        ctx.lineTo(wallX, door.y + door.height);
        ctx.stroke();
        ctx.restore();
      } else {
        // Locked door: solid wall line
        ctx.strokeStyle = '#00FF66';
        ctx.beginPath();
        ctx.moveTo(wallX, door.y);
        ctx.lineTo(wallX, door.y + door.height);
        ctx.stroke();
      }

      // 3. Solid wall below the door gap
      ctx.beginPath();
      ctx.moveTo(wallX, door.y + door.height);
      ctx.lineTo(wallX, canvas.height);
      ctx.stroke();

      ctx.restore();

      // Draw Player
      const player = playerRef.current;
      if (!player.isDead) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00FF66';
        ctx.shadowBlur = 8;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Eye Visor
        ctx.fillStyle = '#080b0e';
        const eyeX = player.facing === 'right' ? player.x + player.width - 7 : player.x + 2;
        ctx.fillRect(eyeX, player.y + 5, 5, 5);
        ctx.restore();
      }

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Level Transition Wipe
      if (transitioning) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00FF66';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL 0${currentLevelNum} CLEARED`, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [allLevelsCompleted, currentLevelNum, handleLevelWin, isWon, levelData, transitioning]);

  return (
    <div className="relative w-full min-h-screen bg-[#06080a] text-[#00FF66] font-mono flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-[#00FF66] selection:text-black">
      {/* Scanline CRT overlay */}
      <div className="fixed inset-0 crt-overlay z-20 pointer-events-none" />

      {/* Main Terminal Frame */}
      <div className="relative z-10 w-full max-w-[840px] bg-[#090d10] border border-[#00FF66]/30 rounded-lg shadow-2xl p-3 sm:p-5 flex flex-col gap-3">
        {/* Terminal Header Bar (100% Identical on Every Level) */}
        <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-widest terminal-glow">
              {levelData.title}
            </span>
          </div>

          {/* Clean Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadLevel(currentLevelNum)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#00FF66]/30 hover:border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66]/10 rounded transition-colors"
              title="Reset Level (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET [R]</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#00FF66]/30 hover:border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66]/10 rounded transition-colors"
              title="Toggle Audio (M)"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'MUTED' : 'MUTE [M]'}</span>
            </button>

            {onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-zinc-700 hover:border-[#00FF66] text-zinc-400 hover:text-[#00FF66] rounded transition-colors ml-2"
              >
                <span>LEVEL CREATOR</span>
              </button>
            )}
          </div>
        </div>

        {/* 2D Canvas Viewport */}
        <div className="relative w-full aspect-[800/450] bg-black border border-[#00FF66]/40 rounded overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full object-contain cursor-crosshair"
          />
        </div>

        {/* Clean Minimalist Footer Controls (Exact Same Across All Levels) */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <div className="flex items-center gap-2">
            <span>MOVE:</span>
            <div className="flex items-center gap-1 text-zinc-300">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">W</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">A</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">D</kbd>
              <span className="text-zinc-600">/</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">ARROWS</kbd>
            </div>
            <span className="ml-2">JUMP:</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px] text-zinc-300">
              SPACE
            </kbd>
          </div>

          <div>
            <span>DEATHS: </span>
            <span className="text-white font-bold">{deaths}</span>
          </div>
        </div>

        {/* Victory Screen Modal */}
        {allLevelsCompleted && (
          <div className="fixed inset-0 z-30 bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#090d10] border-2 border-[#00FF66] rounded-lg p-6 flex flex-col items-center gap-4 text-center terminal-box-glow">
              <CheckCircle2 className="w-12 h-12 text-[#00FF66] animate-bounce" />
              <h2 className="text-2xl font-black text-[#00FF66] terminal-glow tracking-widest">
                SHIFT MASTERED
              </h2>
              <p className="text-xs text-zinc-400">
                You figured out each shift mechanic through pure experimentation!
              </p>

              <div className="w-full bg-[#050709] border border-[#00FF66]/30 p-3 rounded text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Run Time:</span>
                  <span className="text-[#00FF66] font-bold">{finalTime} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Deaths:</span>
                  <span className="text-[#00FF66] font-bold">{deaths}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => {
                    setAllLevelsCompleted(false);
                    loadLevel(1);
                  }}
                  className="flex-1 py-2.5 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-extrabold rounded text-xs transition-colors tracking-wider"
                >
                  PLAY AGAIN (LVL 1)
                </button>
                {onBackToTitle && (
                  <button
                    onClick={onBackToTitle}
                    className="py-2.5 px-4 border border-[#00FF66]/50 hover:bg-[#00FF66]/10 text-[#00FF66] font-semibold rounded text-xs transition-colors"
                  >
                    TITLE MENU
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
