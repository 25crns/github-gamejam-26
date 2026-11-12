import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LevelData, Platform, Spike, DoorWall, ShiftType } from '../game/types';
import { createBaseLayout, getCustomLevels, saveCustomLevel, deleteCustomLevel } from '../game/levels';
import { updatePlayer, InputState } from '../game/physics';
import { sound } from '../audio/soundEngine';
import {
  Plus,
  Trash2,
  Play,
  Square,
  Save,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';

interface LevelEditorProps {
  onBack: () => void;
  onPlayLevel?: (level: LevelData) => void;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({ onBack, onPlayLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Editor Mode: 'EDIT' or 'TEST_PLAY'
  const [mode, setMode] = useState<'EDIT' | 'TEST_PLAY'>('EDIT');

  // Level Metadata
  const [levelId, setLevelId] = useState<number>(4);
  const [levelTitle, setLevelTitle] = useState<string>('LEVEL 04');
  const [shiftType, setShiftType] = useState<ShiftType>('KEY_SHIFT');
  const [mechanicNote, setMechanicNote] = useState<string>('');

  // Geometry state
  const [playerStart, setPlayerStart] = useState<{ x: number; y: number }>({ x: 50, y: 320 });
  const [door, setDoor] = useState<DoorWall>({ x: 785, y: 280, height: 90, isOpen: false });
  const [platforms, setPlatforms] = useState<Platform[]>(() => createBaseLayout().platforms);
  const [spikes, setSpikes] = useState<Spike[]>(() => createBaseLayout().spikes);

  // Selection & drag state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'platform' | 'spike' | 'playerStart' | 'door' | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const gridSize = 10;

  // Export / Save Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [savedLevels, setSavedLevels] = useState<LevelData[]>(() => getCustomLevels());
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Test Play physics references
  const testPlayerRef = useRef({
    x: 50,
    y: 320,
    width: 20,
    height: 24,
    vx: 0,
    vy: 0,
    isGrounded: false,
    facing: 'right' as const,
    isDead: false,
    respawnTimer: 0,
  });

  const testInputsRef = useRef<InputState>({
    left: false,
    right: false,
    jump: false,
    shift: false,
  });

  // Dragging interaction state in Editor
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load baseline template
  const handleResetToBase = () => {
    const base = createBaseLayout();
    setPlayerStart(base.playerStart);
    setDoor(base.door);
    setPlatforms(base.platforms);
    setSpikes(base.spikes);
    setSelectedId(null);
    setSelectedType(null);
    sound.playKeyClick();
  };

  // Add new Platform
  const handleAddPlatform = () => {
    sound.playKeyClick();
    const newId = `platform-${Date.now()}`;
    const newPlat: Platform = {
      id: newId,
      x: 340,
      y: 200,
      width: 120,
      height: 20,
      originalX: 340,
      originalY: 200,
      isShiftable: true,
    };
    setPlatforms((prev) => [...prev, newPlat]);
    setSelectedId(newId);
    setSelectedType('platform');
  };

  // Add new Spikes
  const handleAddSpikes = () => {
    sound.playKeyClick();
    const newId = `spike-${Date.now()}`;
    const newSpike: Spike = {
      id: newId,
      x: 350,
      y: 350,
      width: 100,
      height: 18,
      count: 5,
      originalX: 350,
      originalY: 350,
      isShiftable: true,
    };
    setSpikes((prev) => [...prev, newSpike]);
    setSelectedId(newId);
    setSelectedType('spike');
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    sound.playKeyClick();
    if (selectedType === 'platform') {
      setPlatforms((prev) => prev.filter((p) => p.id !== selectedId));
    } else if (selectedType === 'spike') {
      setSpikes((prev) => prev.filter((s) => s.id !== selectedId));
    }
    setSelectedId(null);
    setSelectedType(null);
  };

  // Save current level to localStorage
  const handleSaveLevel = () => {
    const levelData: LevelData = {
      id: levelId,
      title: levelTitle,
      shiftType,
      playerStart,
      door,
      platforms,
      spikes,
      customMechanicNote: mechanicNote,
    };

    saveCustomLevel(levelData);
    setSavedLevels(getCustomLevels());
    sound.playShiftTrigger();
    setSaveToast(`SAVED "${levelTitle}" LOCALLY!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Generate code for next AI prompt
  const generateLevelCode = (): string => {
    const levelData: LevelData = {
      id: levelId,
      title: levelTitle,
      shiftType,
      playerStart,
      door: {
        x: door.x,
        y: door.y,
        height: door.height,
        isOpen: false,
      },
      platforms: platforms.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        originalX: p.x,
        originalY: p.y,
        isShiftable: p.isShiftable,
      })),
      spikes: spikes.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        count: s.count,
        originalX: s.x,
        originalY: s.y,
        isShiftable: s.isShiftable,
      })),
      customMechanicNote: mechanicNote || undefined,
    };

    return JSON.stringify(levelData, null, 2);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateLevelCode());
    setCopiedCode(true);
    sound.playKeyClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Start test play
  const startTestPlay = () => {
    sound.playKeyClick();
    testPlayerRef.current = {
      x: playerStart.x,
      y: playerStart.y,
      width: 20,
      height: 24,
      vx: 0,
      vy: 0,
      isGrounded: false,
      facing: 'right',
      isDead: false,
      respawnTimer: 0,
    };
    setMode('TEST_PLAY');
  };

  const stopTestPlay = () => {
    sound.playKeyClick();
    setMode('EDIT');
  };

  // Keyboard navigation during Test Play
  useEffect(() => {
    if (mode !== 'TEST_PLAY') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') testInputsRef.current.left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') testInputsRef.current.right = true;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') testInputsRef.current.jump = true;
      if (e.key === 'Shift') {
        testInputsRef.current.shift = true;
        // In test mode, Shift opens door to test exit passage
        door.isOpen = !door.isOpen;
        sound.playShiftTrigger();
      }
      if (e.key === 'r' || e.key === 'R') {
        testPlayerRef.current.x = playerStart.x;
        testPlayerRef.current.y = playerStart.y;
        testPlayerRef.current.vx = 0;
        testPlayerRef.current.vy = 0;
      }
      if (e.key === 'Escape') {
        stopTestPlay();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') testInputsRef.current.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') testInputsRef.current.right = false;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') testInputsRef.current.jump = false;
      if (e.key === 'Shift') testInputsRef.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, door, playerStart]);

  // Canvas Mouse Coordinates Helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  // Editor Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'TEST_PLAY') return;
    const { x, y } = getCanvasCoords(e);

    // 1. Check Player Spawn
    if (Math.hypot(x - (playerStart.x + 10), y - (playerStart.y + 12)) < 18) {
      setSelectedId('playerStart');
      setSelectedType('playerStart');
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: x - playerStart.x, y: y - playerStart.y };
      return;
    }

    // 2. Check Door Gap along right wall
    if (Math.abs(x - door.x) < 20 && y >= door.y && y <= door.y + door.height) {
      setSelectedId('door');
      setSelectedType('door');
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: 0, y: y - door.y };
      return;
    }

    // 3. Check Spikes
    for (const spike of spikes) {
      if (x >= spike.x && x <= spike.x + spike.width && y >= spike.y && y <= spike.y + spike.height) {
        setSelectedId(spike.id);
        setSelectedType('spike');
        isDraggingRef.current = true;
        dragOffsetRef.current = { x: x - spike.x, y: y - spike.y };
        return;
      }
    }

    // 4. Check Platforms
    for (const plat of platforms) {
      if (x >= plat.x && x <= plat.x + plat.width && y >= plat.y && y <= plat.y + plat.height) {
        setSelectedId(plat.id);
        setSelectedType('platform');
        isDraggingRef.current = true;
        dragOffsetRef.current = { x: x - plat.x, y: y - plat.y };
        return;
      }
    }

    // Clicked empty space
    setSelectedId(null);
    setSelectedType(null);
  };

  // Editor Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'TEST_PLAY' || !isDraggingRef.current) return;
    const { x, y } = getCanvasCoords(e);

    const applySnap = (val: number) => {
      return snapToGrid ? Math.round(val / gridSize) * gridSize : Math.round(val);
    };

    if (selectedType === 'playerStart') {
      setPlayerStart({
        x: Math.max(0, Math.min(760, applySnap(x - dragOffsetRef.current.x))),
        y: Math.max(0, Math.min(420, applySnap(y - dragOffsetRef.current.y))),
      });
    } else if (selectedType === 'door') {
      setDoor((prev) => ({
        ...prev,
        y: Math.max(20, Math.min(450 - prev.height, applySnap(y - dragOffsetRef.current.y))),
      }));
    } else if (selectedType === 'platform') {
      setPlatforms((prev) =>
        prev.map((p) => {
          if (p.id !== selectedId) return p;
          const nx = Math.max(0, Math.min(800 - p.width, applySnap(x - dragOffsetRef.current.x)));
          const ny = Math.max(0, Math.min(450 - p.height, applySnap(y - dragOffsetRef.current.y)));
          return { ...p, x: nx, y: ny, originalX: nx, originalY: ny };
        })
      );
    } else if (selectedType === 'spike') {
      setSpikes((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          const nx = Math.max(0, Math.min(800 - s.width, applySnap(x - dragOffsetRef.current.x)));
          const ny = Math.max(0, Math.min(450 - s.height, applySnap(y - dragOffsetRef.current.y)));
          return { ...s, x: nx, y: ny, originalX: nx, originalY: ny };
        })
      );
    }
  };

  // Editor Mouse Up
  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // If Test Play, update physics
      if (mode === 'TEST_PLAY') {
        updatePlayer(
          testPlayerRef.current,
          testInputsRef.current,
          platforms,
          spikes,
          door,
          undefined,
          () => {
            // Respawn
            testPlayerRef.current.x = playerStart.x;
            testPlayerRef.current.y = playerStart.y;
            testPlayerRef.current.vx = 0;
            testPlayerRef.current.vy = 0;
          },
          () => {
            sound.playLevelComplete();
            stopTestPlay();
          }
        );
      }

      // Background
      ctx.fillStyle = '#06090a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.06)';
      ctx.lineWidth = 1;
      const g = 20;
      for (let x = 0; x < canvas.width; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += g) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Platforms
      for (const plat of platforms) {
        const isSel = selectedId === plat.id && mode === 'EDIT';
        ctx.save();
        ctx.fillStyle = isSel ? '#122519' : '#0b1610';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        ctx.strokeStyle = isSel ? '#FFFFFF' : '#00FF66';
        ctx.lineWidth = isSel ? 2 : 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Minimal hatch lines
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
      for (const spike of spikes) {
        const isSel = selectedId === spike.id && mode === 'EDIT';
        ctx.save();
        const toothWidth = spike.width / spike.count;
        ctx.fillStyle = '#2a0a0e';
        ctx.strokeStyle = isSel ? '#FFFFFF' : '#FF3344';
        ctx.lineWidth = isSel ? 2 : 1.5;

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

      // Draw Right Wall and Dotted Door
      ctx.save();
      const wallX = door.x;

      // 1. Solid wall above door
      ctx.strokeStyle = '#00FF66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wallX, 0);
      ctx.lineTo(wallX, door.y);
      ctx.stroke();

      // 2. Door segment (Dotted line when open, or dashed indicator in editor)
      if (door.isOpen || mode === 'EDIT') {
        ctx.save();
        ctx.strokeStyle = door.isOpen ? '#00FF66' : 'rgba(0, 255, 102, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // DOTTED LINE DOOR
        ctx.beginPath();
        ctx.moveTo(wallX, door.y);
        ctx.lineTo(wallX, door.y + door.height);
        ctx.stroke();
        ctx.restore();
      } else {
        // Closed solid wall
        ctx.beginPath();
        ctx.moveTo(wallX, door.y);
        ctx.lineTo(wallX, door.y + door.height);
        ctx.stroke();
      }

      // 3. Solid wall below door
      ctx.beginPath();
      ctx.moveTo(wallX, door.y + door.height);
      ctx.lineTo(wallX, canvas.height);
      ctx.stroke();

      // Door handle marker in editor
      if (mode === 'EDIT' && selectedId === 'door') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(wallX - 3, door.y, 6, door.height);
      }
      ctx.restore();

      // Draw Player Start / Live Player
      if (mode === 'EDIT') {
        // Spawn beacon
        ctx.save();
        ctx.strokeStyle = selectedId === 'playerStart' ? '#FFFFFF' : '#00FF66';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(playerStart.x, playerStart.y, 20, 24);
        ctx.fillStyle = 'rgba(0, 255, 102, 0.3)';
        ctx.fillRect(playerStart.x, playerStart.y, 20, 24);
        ctx.fillStyle = '#00FF66';
        ctx.font = '9px monospace';
        ctx.fillText('SPAWN', playerStart.x - 4, playerStart.y - 4);
        ctx.restore();
      } else {
        // Live Test Player
        const p = testPlayerRef.current;
        if (!p.isDead) {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#00FF66';
          ctx.shadowBlur = 8;
          ctx.fillRect(p.x, p.y, p.width, p.height);

          ctx.fillStyle = '#080b0e';
          const eyeX = p.facing === 'right' ? p.x + p.width - 7 : p.x + 2;
          ctx.fillRect(eyeX, p.y + 5, 5, 5);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [door, mode, platforms, playerStart, selectedId, snapToGrid, spikes]);

  // Selected item property modifiers
  const selectedPlatform = platforms.find((p) => p.id === selectedId);
  const selectedSpike = spikes.find((s) => s.id === selectedId);

  return (
    <div className="relative w-full min-h-screen bg-[#06080a] text-[#00FF66] font-mono flex flex-col items-center justify-center p-3 selection:bg-[#00FF66] selection:text-black">
      {/* Scanline CRT overlay */}
      <div className="fixed inset-0 crt-overlay z-20 pointer-events-none" />

      {/* Main Box */}
      <div className="relative z-10 w-full max-w-[880px] bg-[#090d10] border border-[#00FF66]/30 rounded-lg p-4 flex flex-col gap-3 shadow-2xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#00FF66]/20 pb-3 gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs border border-[#00FF66]/30 px-2 py-1 rounded hover:bg-[#00FF66]/10 text-zinc-300 hover:text-[#00FF66]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>EXIT EDITOR</span>
            </button>
            <span className="text-sm font-bold tracking-wider terminal-glow">
              LEVEL CREATOR &amp; EXPORTER
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs text-white bg-[#00FF66]/20 border border-[#00FF66] px-2 py-1 rounded">
                {saveToast}
              </span>
            )}

            {mode === 'EDIT' ? (
              <button
                onClick={startTestPlay}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-extrabold rounded text-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>TEST PLAY</span>
              </button>
            ) : (
              <button
                onClick={stopTestPlay}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#FF3344] hover:bg-[#FF3344]/90 text-white font-extrabold rounded text-xs transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>STOP TEST</span>
              </button>
            )}

            <button
              onClick={handleSaveLevel}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#00FF66]/40 hover:bg-[#00FF66]/10 rounded transition-colors"
              title="Save Level Locally"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-900 border border-[#00FF66]/60 hover:bg-[#00FF66]/15 rounded transition-colors text-white font-bold"
              title="Export code for next AI prompt"
            >
              <Copy className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>EXPORT JSON</span>
            </button>
          </div>
        </div>

        {/* Level Identity Form */}
        <div className="flex flex-wrap items-center gap-3 bg-[#040608] border border-[#00FF66]/20 p-2 rounded text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">ID:</span>
            <input
              type="number"
              value={levelId}
              onChange={(e) => setLevelId(parseInt(e.target.value) || 1)}
              className="w-14 bg-black border border-[#00FF66]/40 px-1.5 py-0.5 rounded text-[#00FF66] text-center"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">TITLE:</span>
            <input
              type="text"
              value={levelTitle}
              onChange={(e) => setLevelTitle(e.target.value)}
              className="w-28 bg-black border border-[#00FF66]/40 px-2 py-0.5 rounded text-[#00FF66]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">SHIFT TYPE:</span>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value as ShiftType)}
              className="bg-black border border-[#00FF66]/40 px-2 py-0.5 rounded text-[#00FF66]"
            >
              <option value="KEY_SHIFT">KEY_SHIFT (Physical Shift Key)</option>
              <option value="GEOMETRY_SHIFT">GEOMETRY_SHIFT (Click/Double Click Shift)</option>
              <option value="TAB_SHIFT">TAB_SHIFT (Switch Browser Tab)</option>
              <option value="CUSTOM">CUSTOM (Describe in note)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="accent-[#00FF66]"
              />
              <span>Snap 10px</span>
            </label>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddPlatform}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-[#00FF66]/40 hover:bg-[#00FF66]/10 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Platform</span>
            </button>
            <button
              onClick={handleAddSpikes}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-[#FF3344]/50 hover:bg-[#FF3344]/10 rounded text-[#FF6677] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Spikes</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedId}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:text-red-400 disabled:opacity-30 rounded transition-colors text-zinc-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={handleResetToBase}
              className="flex items-center gap-1 px-2 py-1 border border-zinc-700 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Layout</span>
            </button>
          </div>

          {/* Quick Resizer for selected platform */}
          {selectedPlatform && (
            <div className="flex items-center gap-2 bg-[#06080a] px-2 py-1 rounded border border-[#00FF66]/30">
              <span className="text-zinc-500">W:</span>
              <input
                type="number"
                value={selectedPlatform.width}
                onChange={(e) => {
                  const val = Math.max(20, parseInt(e.target.value) || 20);
                  setPlatforms((prev) =>
                    prev.map((p) => (p.id === selectedPlatform.id ? { ...p, width: val } : p))
                  );
                }}
                className="w-14 bg-black border border-zinc-700 px-1 py-0.5 rounded text-white text-center"
              />
              <span className="text-zinc-500">H:</span>
              <input
                type="number"
                value={selectedPlatform.height}
                onChange={(e) => {
                  const val = Math.max(10, parseInt(e.target.value) || 10);
                  setPlatforms((prev) =>
                    prev.map((p) => (p.id === selectedPlatform.id ? { ...p, height: val } : p))
                  );
                }}
                className="w-14 bg-black border border-zinc-700 px-1 py-0.5 rounded text-white text-center"
              />
            </div>
          )}

          {/* Quick Resizer for selected spikes */}
          {selectedSpike && (
            <div className="flex items-center gap-2 bg-[#06080a] px-2 py-1 rounded border border-[#FF3344]/30">
              <span className="text-zinc-500">Width:</span>
              <input
                type="number"
                value={selectedSpike.width}
                onChange={(e) => {
                  const val = Math.max(20, parseInt(e.target.value) || 20);
                  setSpikes((prev) =>
                    prev.map((s) =>
                      s.id === selectedSpike.id
                        ? { ...s, width: val, count: Math.max(1, Math.round(val / 20)) }
                        : s
                    )
                  );
                }}
                className="w-14 bg-black border border-zinc-700 px-1 py-0.5 rounded text-white text-center"
              />
            </div>
          )}
        </div>

        {/* 2D Canvas Viewport */}
        <div className="relative w-full aspect-[800/450] bg-black border border-[#00FF66]/40 rounded overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="w-full h-full object-contain cursor-crosshair"
          />

          {mode === 'TEST_PLAY' && (
            <div className="absolute top-2 left-2 pointer-events-none bg-black/80 px-2 py-1 rounded border border-[#00FF66]/50 text-xs text-[#00FF66] flex items-center gap-2 animate-pulse">
              <span>● LIVE TEST RUN</span>
              <span className="text-zinc-400">| Press ESC to exit test</span>
            </div>
          )}
        </div>

        {/* Editor instructions footer */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-1">
          <span>Click &amp; drag any platform, spike strip, or the SPAWN icon to reposition.</span>
          <span>Right edge vertical line has a dotted door gap opening.</span>
        </div>
      </div>

      {/* Export & Save Code Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#090d10] border border-[#00FF66] rounded-lg p-5 flex flex-col gap-3 shadow-2xl terminal-box-glow max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-2">
              <span className="text-sm font-bold text-[#00FF66] terminal-glow">
                EXPORT LEVEL FOR NEXT AI PROMPT
              </span>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 border border-zinc-700 rounded"
              >
                CLOSE
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Copy this JSON block into your next AI prompt to permanently add this level to the game code:
            </p>

            {/* Code Box */}
            <div className="relative bg-black border border-[#00FF66]/30 rounded p-3 text-[11px] font-mono text-[#00FF66] overflow-x-auto max-h-64">
              <pre>{generateLevelCode()}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">
                Saved in your browser storage ({savedLevels.length} custom levels available)
              </span>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-extrabold text-xs rounded transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                <span>{copiedCode ? 'COPIED TO CLIPBOARD!' : 'COPY LEVEL CODE'}</span>
              </button>
            </div>

            {/* Saved Levels List */}
            {savedLevels.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#00FF66]/20 flex flex-col gap-2">
                <span className="text-xs font-bold text-[#7EE787]">Saved Custom Levels:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {savedLevels.map((lvl) => (
                    <div
                      key={lvl.id}
                      className="flex items-center justify-between bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-800 text-xs"
                    >
                      <span className="text-white font-semibold">
                        {lvl.title} <span className="text-zinc-500">({lvl.shiftType})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setLevelId(lvl.id);
                            setLevelTitle(lvl.title);
                            setShiftType(lvl.shiftType);
                            setPlayerStart(lvl.playerStart);
                            setDoor(lvl.door);
                            setPlatforms(lvl.platforms);
                            setSpikes(lvl.spikes);
                            setShowExportModal(false);
                            sound.playKeyClick();
                          }}
                          className="px-2 py-0.5 bg-[#00FF66]/20 hover:bg-[#00FF66]/30 text-[#00FF66] rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            deleteCustomLevel(lvl.id);
                            setSavedLevels(getCustomLevels());
                          }}
                          className="px-2 py-0.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
