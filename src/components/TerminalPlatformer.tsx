import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LevelData, Platform, Spike, DoorWall, Player } from '../game/types';
import { getLevelData, TOTAL_LEVELS } from '../game/levels';
import { updatePlayer, InputState } from '../game/physics';
import { sound } from '../audio/soundEngine';
import { Volume2, VolumeX, RotateCcw, CheckCircle2, ArrowRight, HelpCircle } from 'lucide-react';

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
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showLevelClearedModal, setShowLevelClearedModal] = useState<boolean>(false);
  const [clearedLevelInfo, setClearedLevelInfo] = useState<{ num: number; explanation: string } | null>(null);
  const [startTime] = useState<number>(() => Date.now());
  const [finalTime, setFinalTime] = useState<number>(0);

  // Level 3 Caps Lock state
  const [isCapsActive, setIsCapsActive] = useState<boolean>(false);

  // Level 9 Tilt-Shift focus state (0 = sharp foreground, 1 = sharp background bridge)
  const [tiltFocus, setTiltFocus] = useState<number>(0);

  // Level 12 URL bar state
  const [urlHashInput, setUrlHashInput] = useState<string>('?door=locked');

  // Level 13 Orientation Shift state
  const [isRotatedPerspective, setIsRotatedPerspective] = useState<boolean>(false);

  // Work Shift (Level 8) Idle tracking
  const lastActiveTimeRef = useRef<number>(Date.now());

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
    isAutoWalking: false,
  });

  const platformsRef = useRef<Platform[]>([]);
  const spikesRef = useRef<Spike[]>([]);
  const doorRef = useRef<DoorWall>({
    x: 785,
    y: 280,
    height: 90,
    isOpen: false,
    closeAnimProgress: 0,
  });

  const inputsRef = useRef<InputState>({
    left: false,
    right: false,
    jump: false,
    shift: false,
  });

  // Level 2 typed sequence buffer
  const typeBufferRef = useRef<string>('');

  // Level 10 dual shift tracking
  const leftShiftDownRef = useRef<boolean>(false);
  const rightShiftDownRef = useRef<boolean>(false);

  // Level 7 clipboard storage
  const clipboardPlatformRef = useRef<Platform | null>(null);
  const mouseCanvasPosRef = useRef<{ x: number; y: number }>({ x: 420, y: 310 });

  // Mouse Dragging State
  const draggingItemRef = useRef<{
    type: 'platform' | 'spike';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // BroadcastChannel for Level 14 Dual-Window Bridge
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

  // Open Door helper
  const unlockDoor = useCallback(() => {
    if (!doorRef.current.isOpen) {
      doorRef.current.isOpen = true;
      sound.playShiftTrigger();
      sound.playDoorOpen();

      // Emit particles along the door opening
      const doorX = doorRef.current.x;
      const doorY = doorRef.current.y;
      const doorH = doorRef.current.height;
      for (let i = 0; i < 24; i++) {
        particlesRef.current.push({
          x: doorX,
          y: doorY + Math.random() * doorH,
          vx: (Math.random() - 1) * 5,
          vy: (Math.random() - 0.5) * 4,
          life: 25,
          maxLife: 25,
          color: '#00FF66',
          size: 2.5,
        });
      }
    }
  }, []);

  // Initialize or reset a level
  const loadLevel = useCallback(
    (lvlNum: number) => {
      const data = getLevelData(lvlNum);
      setLevelData(data);
      setCurrentLevelNum(lvlNum);
      setIsWon(false);
      setShowHint(false);
      setShowLevelClearedModal(false);
      setClearedLevelInfo(null);
      typeBufferRef.current = '';
      leftShiftDownRef.current = false;
      rightShiftDownRef.current = false;
      setTiltFocus(0);
      setIsRotatedPerspective(false);
      lastActiveTimeRef.current = Date.now();

      // Pre-seed clipboard with the source platform on Level 7 so Ctrl+V always works
      const l7Source = data.platforms.find((p) => p.id === 'l7-source');
      clipboardPlatformRef.current = l7Source ? { ...l7Source } : null;

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
        isAutoWalking: false,
      };

      // Deep clone platforms and spikes
      platformsRef.current = data.platforms.map((p) => ({ ...p, isShifted: false }));
      spikesRef.current = data.spikes.map((s) => ({ ...s, isShifted: false }));
      
      // Start door in sliding-down close animation
      doorRef.current = {
        ...data.door,
        isOpen: false,
        closeAnimProgress: 0,
      };

      // Level 4 (Control Shift): Door is open by default
      if (lvlNum === 4) {
        doorRef.current.isOpen = true;
      }

      // Level 12 (URL Shift): initialize URL
      if (lvlNum === 12) {
        setUrlHashInput('?door=locked');
        try {
          window.history.replaceState(null, '', '#door=locked');
        } catch {
          // ignore if sandboxed
        }
      }

      // Ambient tone adjustment
      sound.shiftAmbientPitch(1 + ((lvlNum - 1) % 5) * 0.2);
    },
    []
  );

  // Initialize on mount
  useEffect(() => {
    loadLevel(initialLevelId);
    sound.startAmbientDrone();
  }, [loadLevel, initialLevelId]);

  // Activity updater for Work Shift
  const markActive = useCallback(() => {
    lastActiveTimeRef.current = Date.now();
    if (playerRef.current.isAutoWalking) {
      playerRef.current.isAutoWalking = false;
    }
  }, []);

  // --- LEVEL 11: TAB SWITCH DETECTION ---
  useEffect(() => {
    const triggerTabShift = () => {
      if (currentLevelNum === 11) {
        // Retract the floor-to-ceiling security bulkhead blocking the right platform
        platformsRef.current = platformsRef.current.filter((p) => p.id !== 'tab-bulkhead');
        unlockDoor();
      }
    };

    document.addEventListener('visibilitychange', triggerTabShift);
    window.addEventListener('blur', triggerTabShift);

    return () => {
      document.removeEventListener('visibilitychange', triggerTabShift);
      window.removeEventListener('blur', triggerTabShift);
    };
  }, [currentLevelNum, unlockDoor]);

  // --- LEVEL 12: URL HASH / QUERY SHIFT DETECTION ---
  const triggerUrlShiftUnlock = useCallback(() => {
    // Lower the high url-bridge into position at y=275 so player can cross the chasm
    for (const p of platformsRef.current) {
      if (p.id === 'url-bridge') {
        p.y = 275;
      }
    }
    unlockDoor();
  }, [unlockDoor]);

  useEffect(() => {
    if (currentLevelNum !== 12) return;

    const checkUrlShift = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        hash.includes('unlocked') ||
        hash.includes('shift=true') ||
        hash.includes('shift') ||
        search.includes('unlocked') ||
        search.includes('shift=true')
      ) {
        triggerUrlShiftUnlock();
        setUrlHashInput('?door=unlocked');
      }
    };

    window.addEventListener('hashchange', checkUrlShift);
    window.addEventListener('popstate', checkUrlShift);

    return () => {
      window.removeEventListener('hashchange', checkUrlShift);
      window.removeEventListener('popstate', checkUrlShift);
    };
  }, [currentLevelNum, triggerUrlShiftUnlock]);

  // --- LEVEL 13: PERSPECTIVE / ORIENTATION SHIFT DETECTION ---
  const applyOrientationStaircase = useCallback(() => {
    setIsRotatedPerspective(true);
    // Rotate the 3 vertical wall panels (20x110) into horizontal climbable steps (110x20)!
    for (const p of platformsRef.current) {
      if (p.id === 'orient-step-1') {
        p.x = 240;
        p.y = 320;
        p.width = 110;
        p.height = 20;
      } else if (p.id === 'orient-step-2') {
        p.x = 380;
        p.y = 250;
        p.width = 110;
        p.height = 20;
      } else if (p.id === 'orient-step-3') {
        p.x = 510;
        p.y = 180;
        p.width = 110;
        p.height = 20;
      }
    }
    unlockDoor();
  }, [unlockDoor]);

  useEffect(() => {
    if (currentLevelNum !== 13) return;

    const checkOrientation = () => {
      const isPortrait =
        window.innerHeight > window.innerWidth ||
        (window.screen.orientation && window.screen.orientation.type.includes('portrait')) ||
        (window.screen.orientation && window.screen.orientation.angle !== 0);

      if (isPortrait) {
        applyOrientationStaircase();
      }
    };

    window.addEventListener('resize', checkOrientation);
    if (window.screen.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      if (window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, [currentLevelNum, applyOrientationStaircase]);

  // --- LEVEL 14: DUAL-WINDOW BROADCAST CHANNEL ---
  const spawnTransferredPlatform = useCallback(() => {
    if (!platformsRef.current.find((p) => p.id === 'received-platform')) {
      platformsRef.current.push({
        id: 'received-platform',
        x: 455,
        y: 330,
        width: 125,
        height: 20,
        originalX: 455,
        originalY: 330,
        isShiftable: true,
      });
      // Reset first platform to left side of baffle so both halves of the chasm are bridged!
      const firstPlat = platformsRef.current.find((p) => p.id === 'cross-window-platform');
      if (firstPlat) {
        firstPlat.x = 200;
        firstPlat.y = 330;
      }
      unlockDoor();
    }
  }, [unlockDoor]);

  useEffect(() => {
    if (currentLevelNum !== 14) return;

    try {
      const bc = new BroadcastChannel('shift_multiverse_bridge');
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data?.type === 'TRANSFER_PLATFORM') {
          sound.playShiftTrigger();
          spawnTransferredPlatform();
        }
      };

      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'shift_multiverse_transfer' && e.newValue) {
          sound.playShiftTrigger();
          spawnTransferredPlatform();
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        bc.close();
        window.removeEventListener('storage', handleStorage);
      };
    } catch {
      // safe fallback
    }
  }, [currentLevelNum, spawnTransferredPlatform]);

  // Manual URL update handler (for Level 12)
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    markActive();
    const val = e.target.value;
    setUrlHashInput(val);
    if (
      val.toLowerCase().includes('unlocked') ||
      val.toLowerCase().includes('shift=true') ||
      val.toLowerCase().includes('shift')
    ) {
      triggerUrlShiftUnlock();
    }
    try {
      window.history.replaceState(null, '', '#' + val.replace(/^[#?]/, ''));
    } catch {
      // safe in iframe
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      markActive();

      // Check CapsLock modifier
      if (e.getModifierState) {
        const capsState = e.getModifierState('CapsLock');
        setIsCapsActive(capsState);
        if (currentLevelNum === 3 && capsState) {
          unlockDoor();
        }
      }
      if (e.key === 'CapsLock') {
        const nextCaps = !isCapsActive;
        setIsCapsActive(nextCaps);
        if (currentLevelNum === 3 && nextCaps) {
          unlockDoor();
        }
      }

      // Level 1: Press Shift Key
      if (currentLevelNum === 1 && e.key === 'Shift') {
        unlockDoor();
      }

      // Level 2: Typing 'shift' key sequence
      if (currentLevelNum === 2 && e.key.length === 1) {
        typeBufferRef.current += e.key.toLowerCase();
        if (typeBufferRef.current.length > 20) {
          typeBufferRef.current = typeBufferRef.current.slice(-20);
        }
        if (typeBufferRef.current.endsWith('shift')) {
          unlockDoor();
        }
      }

      // Level 10: Dual Shift (Hold Left Shift + Right Shift raises both drawbridge halves)
      if (currentLevelNum === 10) {
        if (e.code === 'ShiftLeft') leftShiftDownRef.current = true;
        if (e.code === 'ShiftRight') rightShiftDownRef.current = true;
        if (leftShiftDownRef.current && rightShiftDownRef.current) {
          unlockDoor();
        }
      }

      // Level 13: Perspective Shift simulation shortcut
      if (currentLevelNum === 13 && e.altKey && e.shiftKey) {
        applyOrientationStaircase();
      }

      // Level 7: Implicit Clipboard Cut & Paste (Ctrl+X, Ctrl+C, Ctrl+V)
      if (currentLevelNum === 7) {
        const isCtrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        const m = mouseCanvasPosRef.current;

        if (isCtrl && key === 'x') {
          e.preventDefault();
          // Cut blocking spikes on the exit platform (or near cursor)
          const beforeCount = spikesRef.current.length;
          const remainingSpikes = spikesRef.current.filter((s) => {
            if (s.id === 'l7-door-spikes') return false;
            const dist = Math.hypot(m.x - (s.x + s.width / 2), m.y - (s.y + s.height / 2));
            return dist > 180;
          });
          spikesRef.current = remainingSpikes;
          if (remainingSpikes.length !== beforeCount) {
            sound.playShiftTrigger();
          }
          unlockDoor();
        } else if (isCtrl && key === 'c') {
          e.preventDefault();
          const foundPlat =
            platformsRef.current.find((p) => {
              return (
                m.x >= p.x - 30 &&
                m.x <= p.x + p.width + 30 &&
                m.y >= p.y - 30 &&
                m.y <= p.y + p.height + 30
              );
            }) || platformsRef.current.find((p) => p.id === 'l7-source');
          if (foundPlat) {
            clipboardPlatformRef.current = { ...foundPlat };
            sound.playKeyClick();
          }
        } else if (isCtrl && key === 'v') {
          e.preventDefault();
          const template = clipboardPlatformRef.current || {
            id: 'template',
            x: 400,
            y: 320,
            width: 130,
            height: 20,
            originalX: 400,
            originalY: 320,
          };
          // Paste platform at cursor (or in the middle of the 330px void if cursor hasn't moved)
          const pasteX = Math.max(290, Math.min(500, m.x - template.width / 2));
          const pasteY = Math.max(220, Math.min(350, m.y - template.height / 2));
          const newPlat: Platform = {
            ...template,
            id: `pasted-${Date.now()}`,
            x: pasteX,
            y: pasteY,
            width: 140,
            height: 20,
          };
          platformsRef.current.push(newPlat);
          sound.playLand();
          unlockDoor();
        }
      }

      // Prevent scroll on gaming keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Proceed if Level Clear Modal is showing
      if (showLevelClearedModal && (e.key === ' ' || e.key === 'Enter')) {
        handleProceedNextLevel();
        return;
      }

      // --- MOVEMENT INPUTS ---
      if (currentLevelNum === 4) {
        // Level 4: Control Keycap Swap (Shifted to J, L, I)
        if (e.key === 'j' || e.key === 'J') inputsRef.current.left = true;
        if (e.key === 'l' || e.key === 'L') inputsRef.current.right = true;
        if (e.key === 'i' || e.key === 'I') inputsRef.current.jump = true;
      } else {
        // Standard W / A / D / Arrows
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputsRef.current.left = true;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputsRef.current.right = true;
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') inputsRef.current.jump = true;
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
      if (e.getModifierState) {
        setIsCapsActive(e.getModifierState('CapsLock'));
      }

      if (currentLevelNum === 10) {
        if (e.code === 'ShiftLeft') leftShiftDownRef.current = false;
        if (e.code === 'ShiftRight') rightShiftDownRef.current = false;
      }

      if (currentLevelNum === 4) {
        if (e.key === 'j' || e.key === 'J') inputsRef.current.left = false;
        if (e.key === 'l' || e.key === 'L') inputsRef.current.right = false;
        if (e.key === 'i' || e.key === 'I') inputsRef.current.jump = false;
      } else {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputsRef.current.left = false;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputsRef.current.right = false;
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') inputsRef.current.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [applyOrientationStaircase, currentLevelNum, isCapsActive, loadLevel, markActive, showLevelClearedModal, unlockDoor]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  // Canvas Mouse Coordinates Helper
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

  // Mouse Wheel (Level 9 Tilt-Shift focus plane)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    markActive();
    if (currentLevelNum !== 9) return;
    
    setTiltFocus((prev) => {
      const next = Math.max(0, Math.min(1, prev + (e.deltaY > 0 ? 0.15 : -0.15)));
      if (next >= 0.75) {
        unlockDoor();
      }
      return next;
    });
  };

  // Double-Click Handler (for Level 6 Geometry Shift)
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    markActive();
    if (currentLevelNum !== 6) return;
    const { x, y } = getCanvasMousePos(e);

    let shiftedSomething = false;

    // Check platforms: double-clicking the stranded high platforms shifts them down into a bridge!
    for (const p of platformsRef.current) {
      if (p.isShiftable && x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        p.isShifted = !p.isShifted;
        if (p.id === 'platform-mid-1') {
          p.y = p.isShifted ? 330 : p.originalY;
        } else if (p.id === 'platform-mid-2') {
          p.y = p.isShifted ? 330 : p.originalY;
        } else if (p.id === 'ground-left') {
          p.width = p.isShifted ? 220 : 160;
        }
        shiftedSomething = true;
        break;
      }
    }

    // Check spikes (shift them down off the landing pad)
    if (!shiftedSomething) {
      for (const s of spikesRef.current) {
        if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
          s.isShifted = !s.isShifted;
          s.y = s.isShifted ? s.originalY + 120 : s.originalY;
          shiftedSomething = true;
          break;
        }
      }
    }

    if (shiftedSomething) {
      unlockDoor();
    }
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    markActive();
    const coords = getCanvasMousePos(e);
    mouseCanvasPosRef.current = coords;

    // Level 6 & Level 14: Dragging platforms & spikes
    if (currentLevelNum === 6 || currentLevelNum === 14) {
      for (const p of platformsRef.current) {
        if (p.isShiftable && coords.x >= p.x && coords.x <= p.x + p.width && coords.y >= p.y && coords.y <= p.y + p.height) {
          draggingItemRef.current = {
            type: 'platform',
            id: p.id,
            offsetX: coords.x - p.x,
            offsetY: coords.y - p.y,
          };
          sound.playKeyClick();
          return;
        }
      }

      for (const s of spikesRef.current) {
        if (s.isShiftable && coords.x >= s.x && coords.x <= s.x + s.width && coords.y >= s.y && coords.y <= s.y + s.height) {
          draggingItemRef.current = {
            type: 'spike',
            id: s.id,
            offsetX: coords.x - s.x,
            offsetY: coords.y - s.y,
          };
          sound.playKeyClick();
          return;
        }
      }
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    markActive();
    const coords = getCanvasMousePos(e);
    mouseCanvasPosRef.current = coords;

    if ((currentLevelNum === 6 || currentLevelNum === 14) && draggingItemRef.current) {
      const drag = draggingItemRef.current;
      if (drag.type === 'platform') {
        const p = platformsRef.current.find((item) => item.id === drag.id);
        if (p) {
          p.x = Math.max(0, Math.min(840, coords.x - drag.offsetX));
          p.y = Math.max(40, Math.min(420 - p.height, coords.y - drag.offsetY));

          // Level 14: Check if dragged off the right edge to transfer to Window B!
          if (currentLevelNum === 14 && p.x + p.width >= 770) {
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage({
                type: 'TRANSFER_PLATFORM',
                platform: p,
              });
            }
            try {
              localStorage.setItem('shift_multiverse_transfer', Date.now().toString());
            } catch {
              // ignore
            }

            sound.playShiftTrigger();
            // Also materialize in current window after 700ms if playing single-window
            setTimeout(() => {
              spawnTransferredPlatform();
            }, 700);
          }
        }
      } else if (drag.type === 'spike') {
        const s = spikesRef.current.find((item) => item.id === drag.id);
        if (s) {
          s.x = Math.max(0, Math.min(780 - s.width, coords.x - drag.offsetX));
          s.y = Math.max(40, Math.min(480, coords.y - drag.offsetY));
        }
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    markActive();
    if (draggingItemRef.current) {
      sound.playLand();
      draggingItemRef.current = null;
      if (currentLevelNum === 6) {
        unlockDoor();
      }
    }
  };

  // Next level sequence
  const handleLevelWin = useCallback(() => {
    setIsWon(true);
    setClearedLevelInfo({
      num: currentLevelNum,
      explanation: levelData.shiftExplanation,
    });
    setShowLevelClearedModal(true);
  }, [currentLevelNum, levelData.shiftExplanation]);

  const handleProceedNextLevel = () => {
    setShowLevelClearedModal(false);
    if (currentLevelNum < TOTAL_LEVELS) {
      loadLevel(currentLevelNum + 1);
    } else {
      setAllLevelsCompleted(true);
      setFinalTime(Math.round((Date.now() - startTime) / 1000));
    }
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // 0. Update Sliding-Down Close Animation at Start
      if (doorRef.current.closeAnimProgress !== undefined && doorRef.current.closeAnimProgress < 1) {
        doorRef.current.closeAnimProgress = Math.min(1, doorRef.current.closeAnimProgress + 0.05);
      }

      // Check Level 8 Work Shift Idle Timeout (8 seconds of inactivity)
      if (currentLevelNum === 8 && !isWon && !showLevelClearedModal) {
        const idleTime = Date.now() - lastActiveTimeRef.current;
        if (idleTime >= 8000) {
          playerRef.current.isAutoWalking = true;
          doorRef.current.isOpen = true;
        }
      }

      // Update Level 9 Tilt-Shift background bridge platform opacity
      if (currentLevelNum === 9) {
        for (const p of platformsRef.current) {
          if (p.isBackgroundBridge) {
            p.opacity = tiltFocus;
          }
        }
      }

      // Update Level 10 Dual-Shift drawbridge halves
      if (currentLevelNum === 10) {
        for (const p of platformsRef.current) {
          if (p.id === 'dual-bridge-left') {
            const targetY = doorRef.current.isOpen || leftShiftDownRef.current ? 310 : 415;
            p.y += (targetY - p.y) * 0.25;
          } else if (p.id === 'dual-bridge-right') {
            const targetY = doorRef.current.isOpen || rightShiftDownRef.current ? 310 : 415;
            p.y += (targetY - p.y) * 0.25;
          }
        }
      }

      // 1. Update Physics
      if (!isWon && !showLevelClearedModal && !allLevelsCompleted) {
        const activeSpikes =
          currentLevelNum === 3 && isCapsActive
            ? [] // Harmless when Caps Lock shrinks spikes to lowercase!
            : currentLevelNum === 9 && tiltFocus > 0.6
            ? [] // Harmless when blurred out of focus in Level 9!
            : spikesRef.current;

        updatePlayer(
          playerRef.current,
          inputsRef.current,
          platformsRef.current,
          activeSpikes,
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
          },
          {
            isObjectiveShiftLeft: currentLevelNum === 5,
          }
        );
      }

      // 2. Render Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Level 13: subtle perspective shift indicator when rotated
      if (currentLevelNum === 13 && isRotatedPerspective) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(0.02);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

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
        if (plat.isBackgroundBridge) {
          const alpha = plat.opacity ?? 0;
          if (alpha <= 0.05) continue;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#0e2617';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.strokeStyle = alpha > 0.6 ? '#00FF66' : 'rgba(0, 255, 102, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
          ctx.restore();
          continue;
        }

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
      const isMiniatureSpikes = currentLevelNum === 3 && isCapsActive;
      const isTiltBlurred = currentLevelNum === 9 && tiltFocus > 0.2;

      for (const spike of spikesRef.current) {
        ctx.save();
        const toothWidth = spike.width / spike.count;
        const baseY = spike.y + spike.height;

        if (isTiltBlurred) {
          ctx.fillStyle = `rgba(255, 51, 68, ${Math.max(0.1, 1 - tiltFocus * 1.1)})`;
          for (let i = 0; i < spike.count; i++) {
            const sx = spike.x + i * toothWidth + toothWidth / 2;
            const r = 6 + tiltFocus * 12;
            ctx.beginPath();
            ctx.arc(sx, baseY - 6, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          continue;
        }

        ctx.fillStyle = '#2a0a0e';
        ctx.strokeStyle = '#FF3344';
        ctx.lineWidth = 1.5;
        const effectiveHeight = isMiniatureSpikes ? 4 : spike.height;

        for (let i = 0; i < spike.count; i++) {
          const sx = spike.x + i * toothWidth;
          ctx.beginPath();
          ctx.moveTo(sx, baseY);
          ctx.lineTo(sx + toothWidth / 2, baseY - effectiveHeight);
          ctx.lineTo(sx + toothWidth, baseY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Vertical Wall & Sliding-Down Dashed Door along Right Edge
      const door = doorRef.current;
      const wallX = door.x;
      const closeProgress = door.closeAnimProgress ?? 1;
      ctx.save();
      ctx.lineWidth = 2;

      // 1. Solid wall above the door gap
      ctx.strokeStyle = '#00FF66';
      ctx.beginPath();
      ctx.moveTo(wallX, 0);
      ctx.lineTo(wallX, door.y);
      ctx.stroke();

      // 2. Door segment
      if (!door.isOpen) {
        ctx.save();
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(wallX, door.y);
        ctx.lineTo(wallX, door.y + door.height * closeProgress);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
        ctx.fillRect(wallX - 6, door.y, 12, door.height);
        ctx.restore();
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

        if (player.isAutoWalking) {
          ctx.fillStyle = '#00FF66';
          ctx.font = '8px monospace';
          ctx.fillText('SHIFT OVER', player.x - 12, player.y - 4);
        }

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

      ctx.restore(); // End perspective transform

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [allLevelsCompleted, currentLevelNum, handleLevelWin, isCapsActive, isRotatedPerspective, isWon, levelData, showLevelClearedModal, tiltFocus]);

  // Labels casing format (for Level 3 Caps Lock Shift)
  const formatLabel = (text: string) => {
    if (currentLevelNum === 3 && isCapsActive) {
      return text.toLowerCase();
    }
    return text;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#06080a] text-[#00FF66] font-mono flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-[#00FF66] selection:text-black">
      {/* Scanline CRT overlay */}
      <div className="fixed inset-0 crt-overlay z-20 pointer-events-none" />

      {/* Main Terminal Frame */}
      <div className="relative z-10 w-full max-w-[840px] bg-[#090d10] border border-[#00FF66]/30 rounded-lg shadow-2xl p-3 sm:p-5 flex flex-col gap-3">
        {/* Terminal Header Bar (100% Identical on Every Level) */}
        <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-widest terminal-glow">
              {formatLabel(`LEVEL ${currentLevelNum < 10 ? '0' + currentLevelNum : currentLevelNum}`)}
            </span>
            {levelData.subtleTitle && (
              <>
                <span className="text-[#00FF66]/40 text-xs select-none">//</span>
                <span className="text-xs font-semibold tracking-wider text-[#7EE787]">
                  {formatLabel(levelData.subtleTitle)}
                </span>
              </>
            )}
          </div>

          {/* Clean Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playKeyClick();
                setShowHint((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded transition-colors ${
                showHint
                  ? 'bg-[#00FF66] text-black border-[#00FF66] font-bold'
                  : 'border-[#00FF66]/30 hover:border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66]/10'
              }`}
              title="Toggle Level Hint"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{formatLabel('HINT')}</span>
            </button>

            <button
              onClick={() => loadLevel(currentLevelNum)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#00FF66]/30 hover:border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66]/10 rounded transition-colors"
              title="Reset Level (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{formatLabel('RESET [R]')}</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#00FF66]/30 hover:border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66]/10 rounded transition-colors"
              title="Toggle Audio (M)"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? formatLabel('MUTED') : formatLabel('MUTE [M]')}</span>
            </button>

            {onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-zinc-700 hover:border-[#00FF66] text-zinc-400 hover:text-[#00FF66] rounded transition-colors ml-2"
              >
                <span>{formatLabel('LEVEL CREATOR')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Level Hint Box */}
        {showHint && (
          <div className="bg-[#050806] border border-[#00FF66]/40 px-3.5 py-2.5 rounded text-xs text-[#7EE787] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00FF66] shrink-0" />
              <span>{formatLabel(levelData.hint)}</span>
            </div>
            <button
              onClick={() => setShowHint(false)}
              className="text-[10px] text-zinc-400 hover:text-[#00FF66] shrink-0 font-bold"
            >
              {formatLabel('[HIDE]')}
            </button>
          </div>
        )}

        {/* Level 12: URL Address input bar */}
        {currentLevelNum === 12 && (
          <div className="flex items-center gap-2 bg-[#050709] border border-[#00FF66]/30 px-2.5 py-1 rounded text-xs">
            <span className="text-zinc-500 font-bold">URL:</span>
            <span className="text-zinc-400">.../game</span>
            <input
              type="text"
              value={urlHashInput}
              onChange={handleUrlInputChange}
              className="flex-1 bg-black border border-[#00FF66]/40 px-2 py-0.5 rounded text-[#00FF66] font-mono focus:outline-none focus:border-[#00FF66]"
            />
          </div>
        )}

        {/* 2D Canvas Viewport */}
        <div className="relative w-full aspect-[800/450] bg-black border border-[#00FF66]/40 rounded overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onWheel={handleWheel}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full object-contain cursor-crosshair"
          />
        </div>

        {/* Clean Minimalist Footer Controls (Consistent Layout) */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <div className="flex items-center gap-2">
            <span>{formatLabel('MOVE:')}</span>
            {currentLevelNum === 4 ? (
              // Level 4: Control Keycaps Swap
              <div className="flex items-center gap-1 text-zinc-300">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-[#00FF66]/40 text-[#00FF66] rounded text-[11px]">J</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-[#00FF66]/40 text-[#00FF66] rounded text-[11px]">L</kbd>
                <span className="text-zinc-600 ml-2">{formatLabel('JUMP:')}</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-[#00FF66]/40 text-[#00FF66] rounded text-[11px]">I</kbd>
              </div>
            ) : (
              // Standard Controls across other levels
              <div className="flex items-center gap-1 text-zinc-300">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">{formatLabel('W')}</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">{formatLabel('A')}</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">{formatLabel('D')}</kbd>
                <span className="text-zinc-600">/</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px]">{formatLabel('ARROWS')}</kbd>
                <span className="ml-2 text-zinc-500">{formatLabel('JUMP:')}</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[11px] text-zinc-300">
                  {formatLabel('SPACE')}
                </kbd>
              </div>
            )}
          </div>

          <div>
            <span>{formatLabel('DEATHS:')} </span>
            <span className="text-white font-bold">{deaths}</span>
          </div>
        </div>

        {/* Level Cleared Explanation Modal */}
        {showLevelClearedModal && clearedLevelInfo && (
          <div className="fixed inset-0 z-30 bg-black/85 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#090d10] border-2 border-[#00FF66] rounded-lg p-5 flex flex-col gap-3 shadow-2xl terminal-box-glow">
              <div className="flex items-center gap-2 border-b border-[#00FF66]/20 pb-2">
                <CheckCircle2 className="w-5 h-5 text-[#00FF66]" />
                <span className="text-sm font-bold tracking-widest text-[#00FF66] terminal-glow">
                  LEVEL {clearedLevelInfo.num < 10 ? '0' + clearedLevelInfo.num : clearedLevelInfo.num} CLEARED
                </span>
              </div>

              <div className="bg-[#050709] border border-[#00FF66]/30 p-3 rounded text-xs space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-bold tracking-wider block">
                  &gt;&gt; SHIFT INTERPRETATION:
                </span>
                <p className="text-[#00FF66] font-semibold leading-relaxed">
                  {clearedLevelInfo.explanation}
                </p>
              </div>

              <button
                onClick={handleProceedNextLevel}
                className="w-full py-2.5 bg-[#00FF66] hover:bg-[#00FF66]/90 text-black font-extrabold text-xs tracking-wider rounded transition-colors flex items-center justify-center gap-2 mt-1 shadow-[0_0_15px_rgba(0,255,102,0.3)]"
              >
                <span>PROCEED TO NEXT LEVEL</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* Victory Screen Modal */}
        {allLevelsCompleted && (
          <div className="fixed inset-0 z-30 bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#090d10] border-2 border-[#00FF66] rounded-lg p-6 flex flex-col items-center gap-4 text-center terminal-box-glow">
              <CheckCircle2 className="w-12 h-12 text-[#00FF66] animate-bounce" />
              <h2 className="text-2xl font-black text-[#00FF66] terminal-glow tracking-widest">
                SHIFT MASTERED: 14/14
              </h2>
              <p className="text-xs text-zinc-400">
                You conquered all 14 levels and cracked every creative interpretation of SHIFT!
              </p>

              <div className="w-full bg-[#050709] border border-[#00FF66]/30 p-3 rounded text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Run Time:</span>
                  <span className="text-[#00FF66] font-bold">{finalTime} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Deaths:</span>
                  <span className="text-[#00FF66] font-bold">{deaths}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Campaign Levels:</span>
                  <span className="text-[#00FF66] font-bold">14 Sectors Completed</span>
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
