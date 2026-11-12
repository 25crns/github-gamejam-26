import { LevelData, Platform, Spike, DoorWall } from './types';

/**
 * Creates the default baseline layout for the Level Editor reset action.
 */
export function createBaseLayout(): {
  playerStart: { x: number; y: number };
  door: DoorWall;
  platforms: Platform[];
  spikes: Spike[];
} {
  const playerStart = { x: 50, y: 320 };

  const platforms: Platform[] = [
    {
      id: 'ground-left',
      x: 0,
      y: 370,
      width: 200,
      height: 80,
      originalX: 0,
      originalY: 370,
      isShiftable: true,
    },
    {
      id: 'ground-right',
      x: 600,
      y: 370,
      width: 185,
      height: 80,
      originalX: 600,
      originalY: 370,
      isShiftable: true,
    },
    {
      id: 'platform-mid-1',
      x: 230,
      y: 290,
      width: 120,
      height: 20,
      originalX: 230,
      originalY: 290,
      isShiftable: true,
    },
    {
      id: 'platform-mid-2',
      x: 410,
      y: 210,
      width: 140,
      height: 20,
      originalX: 410,
      originalY: 210,
      isShiftable: true,
    },
    {
      id: 'pit-floor',
      x: 200,
      y: 430,
      width: 400,
      height: 20,
      originalX: 200,
      originalY: 430,
      isShiftable: false,
    },
  ];

  const spikes: Spike[] = [
    {
      id: 'spike-pit',
      x: 210,
      y: 412,
      width: 380,
      height: 18,
      count: 19,
      originalX: 210,
      originalY: 412,
      isShiftable: true,
    },
    {
      id: 'spike-mid',
      x: 460,
      y: 192,
      width: 40,
      height: 18,
      count: 2,
      originalX: 460,
      originalY: 192,
      isShiftable: true,
    },
  ];

  const door: DoorWall = {
    x: 785,
    y: 280,
    height: 90,
    isOpen: false,
    closeAnimProgress: 0,
  };

  return { playerStart, door, platforms, spikes };
}

export const TOTAL_LEVELS = 14;

/**
 * Returns bespoke Level Data for each level index from 1 to 14.
 * Each level's platform & hazard geometry is specifically engineered around its SHIFT mechanic
 * so that normal platforming cannot solve it without triggering the mechanic.
 */
export function getLevelData(levelNum: number): LevelData {
  const customLevels = getCustomLevels();
  const custom = customLevels.find((l) => l.id === levelNum);
  if (custom) {
    return JSON.parse(JSON.stringify(custom));
  }

  const title = `LEVEL ${levelNum < 10 ? '0' + levelNum : levelNum}`;

  switch (levelNum) {
    case 1:
      // 1. KEY_SHIFT: Classic stepping-stone intro climb to a sealed right doorway.
      return {
        id: 1,
        title,
        subtleTitle: 'UNDER YOUR PINKY',
        hint: 'Look at your physical keyboard—there is a key literally named after this game.',
        shiftType: 'KEY_SHIFT',
        shiftExplanation:
          'Physical Shift Key: Pressing the Shift modifier key on your keyboard disengaged the door barrier.',
        playerStart: { x: 50, y: 320 },
        door: { x: 785, y: 280, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l1-left', x: 0, y: 370, width: 180, height: 80, originalX: 0, originalY: 370 },
          { id: 'l1-step1', x: 220, y: 310, width: 110, height: 20, originalX: 220, originalY: 310 },
          { id: 'l1-step2', x: 380, y: 250, width: 110, height: 20, originalX: 380, originalY: 250 },
          { id: 'l1-right', x: 550, y: 370, width: 235, height: 80, originalX: 550, originalY: 370 },
          { id: 'l1-pit', x: 180, y: 430, width: 370, height: 20, originalX: 180, originalY: 430 },
        ],
        spikes: [
          { id: 'l1-spikes', x: 190, y: 412, width: 350, height: 18, count: 17, originalX: 190, originalY: 412 },
        ],
      };

    case 2:
      // 2. TYPE_SHIFT: Split-level chamber with central island and upper exit terrace.
      return {
        id: 2,
        title,
        subtleTitle: 'WPM?',
        hint: 'Try typing the 5-letter word "shift" directly on your keyboard.',
        shiftType: 'TYPE_SHIFT',
        shiftExplanation:
          'Keyboard Spelling: Typing the letters S-H-I-F-T sequentially on the keyboard unlocked the gate.',
        playerStart: { x: 45, y: 330 },
        door: { x: 785, y: 150, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l2-left', x: 0, y: 380, width: 160, height: 70, originalX: 0, originalY: 380 },
          { id: 'l2-mid1', x: 200, y: 320, width: 130, height: 20, originalX: 200, originalY: 320 },
          { id: 'l2-mid2', x: 380, y: 260, width: 130, height: 20, originalX: 380, originalY: 260 },
          { id: 'l2-right', x: 560, y: 240, width: 225, height: 210, originalX: 560, originalY: 240 },
          { id: 'l2-pit', x: 160, y: 430, width: 400, height: 20, originalX: 160, originalY: 430 },
        ],
        spikes: [
          { id: 'l2-pit-spikes', x: 170, y: 412, width: 380, height: 18, count: 19, originalX: 170, originalY: 412 },
          { id: 'l2-ledge-spike', x: 245, y: 302, width: 40, height: 18, count: 2, originalX: 245, originalY: 302 },
        ],
      };

    case 3:
      // 3. CAPS_SHIFT: Low-ceiling tunnel with a 400px carpet of spikes.
      return {
        id: 3,
        title,
        subtleTitle: 'STOP SHOUTING NOW',
        hint: 'Everything is in UPPERCASE. Press Caps Lock to shift the room (and the spikes) into lowercase.',
        shiftType: 'CAPS_SHIFT',
        shiftExplanation:
          'Case Shift: Toggling Caps Lock shifted all UI text to lowercase and shrank the tall spikes into harmless lowercase bumps.',
        playerStart: { x: 50, y: 330 },
        door: { x: 785, y: 290, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l3-floor', x: 0, y: 380, width: 785, height: 70, originalX: 0, originalY: 380 },
          { id: 'l3-ceiling', x: 180, y: 210, width: 440, height: 120, originalX: 180, originalY: 210 },
        ],
        spikes: [
          { id: 'l3-spike-carpet', x: 200, y: 362, width: 400, height: 18, count: 20, originalX: 200, originalY: 362 },
        ],
      };

    case 4:
      // 4. CONTROLS_SHIFT: Multi-tier zig-zag climb where controls are swapped to J / L / I.
      return {
        id: 4,
        title,
        subtleTitle: 'RIGHT HAND DRIFT',
        hint: 'Look closely at the bottom-left MOVE and JUMP legend—your control keys have shifted across the keyboard.',
        shiftType: 'CONTROLS_SHIFT',
        shiftExplanation:
          'Control Shift: Movement keys shifted from W/A/D to J (Left), L (Right), and I (Jump).',
        playerStart: { x: 40, y: 340 },
        door: { x: 785, y: 110, height: 90, isOpen: true, closeAnimProgress: 1 },
        platforms: [
          { id: 'l4-start', x: 0, y: 380, width: 150, height: 70, originalX: 0, originalY: 380 },
          { id: 'l4-step1', x: 200, y: 325, width: 110, height: 20, originalX: 200, originalY: 325 },
          { id: 'l4-step2', x: 360, y: 265, width: 110, height: 20, originalX: 360, originalY: 265 },
          { id: 'l4-step3', x: 510, y: 200, width: 110, height: 20, originalX: 510, originalY: 200 },
          { id: 'l4-exit', x: 660, y: 200, width: 125, height: 250, originalX: 660, originalY: 200 },
          { id: 'l4-pit', x: 150, y: 430, width: 510, height: 20, originalX: 150, originalY: 430 },
        ],
        spikes: [
          { id: 'l4-spikes', x: 160, y: 412, width: 490, height: 18, count: 24, originalX: 160, originalY: 412 },
        ],
      };

    case 5:
      // 5. OBJECTIVE_SHIFT: The path to the right is completely walled off. Walking off the left edge wins.
      return {
        id: 5,
        title,
        subtleTitle: 'LOOK BEHIND YOU',
        hint: 'Going right is impossible. What if the exit itself shifted to the opposite side of the room?',
        shiftType: 'OBJECTIVE_SHIFT',
        shiftExplanation:
          'Objective Shift: The right path was impossible because the goal itself shifted to the left edge of the screen.',
        playerStart: { x: 90, y: 320 },
        door: { x: 785, y: 280, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l5-left', x: 0, y: 370, width: 210, height: 80, originalX: 0, originalY: 370 },
          { id: 'l5-wall', x: 280, y: 60, width: 35, height: 370, originalX: 280, originalY: 60 },
          { id: 'l5-right', x: 650, y: 370, width: 135, height: 80, originalX: 650, originalY: 370 },
          { id: 'l5-pit', x: 210, y: 430, width: 440, height: 20, originalX: 210, originalY: 430 },
        ],
        spikes: [
          { id: 'l5-pit-spikes', x: 215, y: 412, width: 430, height: 18, count: 21, originalX: 215, originalY: 412 },
          { id: 'l5-top-spikes', x: 280, y: 42, width: 35, height: 18, count: 2, originalX: 280, originalY: 42 },
        ],
      };

    case 6:
      // 6. GEOMETRY_SHIFT: Platforms stranded near ceiling and spikes on landing pad.
      return {
        id: 6,
        title,
        subtleTitle: 'SOME ASSEMBLY REQUIRED',
        hint: 'Use your mouse to drag (or double-click) the floating platforms down into the gap and move the spikes off the right ledge.',
        shiftType: 'GEOMETRY_SHIFT',
        shiftExplanation:
          'Geometry Shift: Dragging or double-clicking platforms and spike strips shifted their physical coordinates to build a safe bridge.',
        playerStart: { x: 50, y: 320 },
        door: { x: 785, y: 280, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'ground-left', x: 0, y: 370, width: 160, height: 80, originalX: 0, originalY: 370, isShiftable: true },
          { id: 'platform-mid-1', x: 210, y: 70, width: 140, height: 20, originalX: 210, originalY: 70, isShiftable: true },
          { id: 'platform-mid-2', x: 420, y: 70, width: 140, height: 20, originalX: 420, originalY: 70, isShiftable: true },
          { id: 'ground-right', x: 620, y: 370, width: 165, height: 80, originalX: 620, originalY: 370, isShiftable: false },
          { id: 'pit-floor', x: 160, y: 430, width: 460, height: 20, originalX: 160, originalY: 430, isShiftable: false },
        ],
        spikes: [
          { id: 'spike-pit', x: 170, y: 412, width: 440, height: 18, count: 22, originalX: 170, originalY: 412, isShiftable: true },
          { id: 'spike-mid', x: 630, y: 352, width: 140, height: 18, count: 7, originalX: 630, originalY: 352, isShiftable: true },
        ],
      };

    case 7:
      // 7. CLIPBOARD_SHIFT: One small platform followed by a 330px void and a spike-covered exit ledge.
      return {
        id: 7,
        title,
        subtleTitle: 'STONE AND PAPER GAME',
        hint: 'Use keyboard editing shortcuts: press Ctrl+C / Ctrl+V to copy and paste a platform into the gap, and Ctrl+X to cut the spikes.',
        shiftType: 'CLIPBOARD_SHIFT',
        shiftExplanation:
          'Clipboard Shift: Pressing Ctrl+C and Ctrl+V copied and pasted a platform across the void, and Ctrl+X cut the blocking spikes out of existence.',
        playerStart: { x: 45, y: 310 },
        door: { x: 785, y: 230, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l7-left', x: 0, y: 360, width: 140, height: 90, originalX: 0, originalY: 360, isShiftable: true },
          { id: 'l7-source', x: 180, y: 320, width: 110, height: 20, originalX: 180, originalY: 320, isShiftable: true },
          { id: 'l7-right', x: 620, y: 320, width: 165, height: 130, originalX: 620, originalY: 320, isShiftable: false },
          { id: 'l7-pit', x: 140, y: 430, width: 480, height: 20, originalX: 140, originalY: 430, isShiftable: false },
        ],
        spikes: [
          { id: 'l7-pit-spikes', x: 150, y: 412, width: 460, height: 18, count: 23, originalX: 150, originalY: 412 },
          { id: 'l7-door-spikes', x: 625, y: 302, width: 150, height: 18, count: 8, originalX: 625, originalY: 302 },
        ],
      };

    case 8:
      // 8. WORK_SHIFT: Narrow crawlspace lined with 560px of continuous spikes.
      return {
        id: 8,
        title,
        subtleTitle: 'TIRED',
        hint: 'Your character is tired of working. Take your hands off the keyboard and mouse for 8 seconds to end your work shift.',
        shiftType: 'WORK_SHIFT',
        shiftExplanation:
          'Shift Work Schedule: Remaining completely idle for 8 seconds ended your work shift, allowing your character to clock out and stroll harmlessly through the spike tunnel.',
        playerStart: { x: 50, y: 330 },
        door: { x: 785, y: 290, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l8-floor', x: 0, y: 380, width: 785, height: 70, originalX: 0, originalY: 380 },
          { id: 'l8-overhang', x: 150, y: 0, width: 580, height: 342, originalX: 150, originalY: 0 },
        ],
        spikes: [
          { id: 'l8-gauntlet', x: 160, y: 362, width: 560, height: 18, count: 28, originalX: 160, originalY: 362 },
        ],
      };

    case 9:
      // 9. TILT_SHIFT: High canyon with 460px gap and foreground spike curtains.
      return {
        id: 9,
        title,
        subtleTitle: 'I LOVE PHOTOGRAPHY',
        hint: 'Scroll your mouse wheel over the canvas to shift the camera focus plane—blurring the spikes and focusing the hidden background bridge.',
        shiftType: 'TILT_SHIFT',
        shiftExplanation:
          'Tilt-Shift Lens: Scrolling the mouse wheel shifted the optical depth-of-field, dissolving foreground spikes into bokeh while focusing a solid background bridge.',
        playerStart: { x: 50, y: 170 },
        door: { x: 785, y: 130, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l9-left-cliff', x: 0, y: 220, width: 160, height: 230, originalX: 0, originalY: 220 },
          { id: 'l9-right-cliff', x: 620, y: 220, width: 165, height: 230, originalX: 620, originalY: 220 },
          { id: 'l9-pit', x: 160, y: 430, width: 460, height: 20, originalX: 160, originalY: 430 },
          {
            id: 'bg-tilt-bridge',
            x: 160,
            y: 220,
            width: 460,
            height: 20,
            originalX: 160,
            originalY: 220,
            isBackgroundBridge: true,
            opacity: 0,
          },
        ],
        spikes: [
          { id: 'l9-pit-spikes', x: 170, y: 412, width: 440, height: 18, count: 22, originalX: 170, originalY: 412 },
          { id: 'l9-fg-spike1', x: 240, y: 202, width: 60, height: 18, count: 3, originalX: 240, originalY: 202 },
          { id: 'l9-fg-spike2', x: 360, y: 202, width: 60, height: 18, count: 3, originalX: 360, originalY: 202 },
          { id: 'l9-fg-spike3', x: 480, y: 202, width: 60, height: 18, count: 3, originalX: 480, originalY: 202 },
        ],
      };

    case 10:
      // 10. DUAL_SHIFT: Symmetrical chasm with two retracted drawbridge halves.
      return {
        id: 10,
        title,
        subtleTitle: 'SHIFT AGAIN?',
        hint: 'Your keyboard has two Shift keys. Hold down BOTH Left Shift and Right Shift at the same time.',
        shiftType: 'DUAL_SHIFT',
        shiftExplanation:
          'Dual Shift: Holding both Left Shift and Right Shift simultaneously raised both drawbridge halves and unlocked the gate.',
        playerStart: { x: 50, y: 260 },
        door: { x: 785, y: 220, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l10-left', x: 0, y: 310, width: 170, height: 140, originalX: 0, originalY: 310 },
          { id: 'dual-bridge-left', x: 190, y: 415, width: 180, height: 20, originalX: 190, originalY: 415 },
          { id: 'dual-bridge-right', x: 410, y: 415, width: 180, height: 20, originalX: 410, originalY: 415 },
          { id: 'l10-right', x: 610, y: 310, width: 175, height: 140, originalX: 610, originalY: 310 },
          { id: 'l10-pit', x: 170, y: 430, width: 440, height: 20, originalX: 170, originalY: 430 },
        ],
        spikes: [
          { id: 'l10-spikes', x: 175, y: 412, width: 430, height: 18, count: 21, originalX: 175, originalY: 412 },
        ],
      };

    case 11:
      // 11. TAB_SHIFT: Security bulkhead retracts when switching browser tabs.
      return {
        id: 11,
        title,
        subtleTitle: 'LET IT BOIL',
        hint: 'The security bulkhead only moves when you are not looking. Switch to another browser tab (or click outside the window) and come back.',
        shiftType: 'TAB_SHIFT',
        shiftExplanation:
          'Tab Shift: Switching to another browser tab triggered a context switch that retracted the security bulkhead and opened the door.',
        playerStart: { x: 50, y: 320 },
        door: { x: 785, y: 280, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l11-left', x: 0, y: 370, width: 180, height: 80, originalX: 0, originalY: 370 },
          { id: 'l11-mid1', x: 230, y: 320, width: 120, height: 20, originalX: 230, originalY: 320 },
          { id: 'l11-mid2', x: 400, y: 320, width: 120, height: 20, originalX: 400, originalY: 320 },
          { id: 'l11-right', x: 570, y: 370, width: 215, height: 80, originalX: 570, originalY: 370 },
          { id: 'tab-bulkhead', x: 630, y: 0, width: 24, height: 370, originalX: 630, originalY: 0 },
          { id: 'l11-pit', x: 180, y: 430, width: 390, height: 20, originalX: 180, originalY: 430 },
        ],
        spikes: [
          { id: 'l11-spikes', x: 190, y: 412, width: 370, height: 18, count: 18, originalX: 190, originalY: 412 },
        ],
      };

    case 12:
      // 12. URL_SHIFT: Elevated right terminal deck guarded by a locked laser gate and URL-controlled bridge.
      return {
        id: 12,
        title,
        subtleTitle: 'WOWWWW.',
        hint: 'Edit the URL bar above the canvas from ?door=locked to ?door=unlocked.',
        shiftType: 'URL_SHIFT',
        shiftExplanation:
          'URL Query Shift: Changing the URL parameter from ?door=locked to ?door=unlocked deployed the bridge and opened the exit.',
        playerStart: { x: 50, y: 320 },
        door: { x: 785, y: 170, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l12-left', x: 0, y: 370, width: 180, height: 80, originalX: 0, originalY: 370 },
          { id: 'l12-step1', x: 230, y: 310, width: 120, height: 20, originalX: 230, originalY: 310 },
          { id: 'url-bridge', x: 400, y: 40, width: 130, height: 20, originalX: 400, originalY: 40 },
          { id: 'l12-right', x: 580, y: 260, width: 205, height: 190, originalX: 580, originalY: 260 },
          { id: 'l12-pit', x: 180, y: 430, width: 400, height: 20, originalX: 180, originalY: 430 },
        ],
        spikes: [
          { id: 'l12-spikes', x: 190, y: 412, width: 380, height: 18, count: 19, originalX: 190, originalY: 412 },
        ],
      };

    case 13:
      // 13. ORIENTATION_SHIFT: Sheer vertical shaft where rotating display orientation forms a staircase.
      return {
        id: 13,
        title,
        subtleTitle: 'ENGLISH OR SPANISH',
        hint: 'Rotate your screen/window into portrait orientation (or press Alt+Shift) to tip the vertical pillars into horizontal stairs.',
        shiftType: 'ORIENTATION_SHIFT',
        shiftExplanation:
          'Perspective Shift: Rotating the display orientation shifted the vertical wall panels into a climbable staircase up to the ceiling exit.',
        playerStart: { x: 50, y: 340 },
        door: { x: 785, y: 40, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l13-bottom', x: 0, y: 390, width: 240, height: 60, originalX: 0, originalY: 390 },
          { id: 'orient-step-1', x: 260, y: 120, width: 20, height: 110, originalX: 260, originalY: 120 },
          { id: 'orient-step-2', x: 410, y: 80, width: 20, height: 110, originalX: 410, originalY: 80 },
          { id: 'orient-step-3', x: 550, y: 40, width: 20, height: 110, originalX: 550, originalY: 40 },
          { id: 'l13-top-exit', x: 640, y: 130, width: 145, height: 320, originalX: 640, originalY: 130 },
          { id: 'l13-pit', x: 240, y: 430, width: 400, height: 20, originalX: 240, originalY: 430 },
        ],
        spikes: [
          { id: 'l13-spikes', x: 250, y: 412, width: 380, height: 18, count: 19, originalX: 250, originalY: 412 },
        ],
      };

    case 14:
      // 14. DUAL_WINDOW_SHIFT: 485px chasm divided by a central hanging baffle wall.
      return {
        id: 14,
        title,
        subtleTitle: 'EXAM TIME',
        hint: 'One platform is not enough. Drag the floating platform all the way off the right edge of the screen to shift a second platform across windows.',
        shiftType: 'DUAL_WINDOW_SHIFT',
        shiftExplanation:
          'Dual-Window Bridge: Dragging the floating platform off the right edge of Window A transferred it into Window B via BroadcastChannel, providing two platforms to cross both sides of the central divider.',
        playerStart: { x: 45, y: 320 },
        door: { x: 785, y: 280, height: 90, isOpen: false, closeAnimProgress: 0 },
        platforms: [
          { id: 'l14-left', x: 0, y: 370, width: 145, height: 80, originalX: 0, originalY: 370 },
          {
            id: 'cross-window-platform',
            x: 195,
            y: 330,
            width: 120,
            height: 20,
            originalX: 195,
            originalY: 330,
            isShiftable: true,
          },
          { id: 'l14-baffle', x: 380, y: 80, width: 24, height: 220, originalX: 380, originalY: 80, isShiftable: false },
          { id: 'l14-right', x: 630, y: 370, width: 155, height: 80, originalX: 630, originalY: 370 },
          { id: 'l14-pit', x: 145, y: 430, width: 485, height: 20, originalX: 145, originalY: 430 },
        ],
        spikes: [
          { id: 'l14-spikes', x: 155, y: 412, width: 465, height: 18, count: 23, originalX: 155, originalY: 412 },
        ],
      };

    default:
      return getLevelData(1);
  }
}

const CUSTOM_LEVELS_KEY = 'shift_custom_levels_v1';

export function getCustomLevels(): LevelData[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomLevel(level: LevelData): void {
  try {
    const existing = getCustomLevels();
    const index = existing.findIndex((l) => l.id === level.id);
    if (index >= 0) {
      existing[index] = level;
    } else {
      existing.push(level);
    }
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save custom level', e);
  }
}

export function deleteCustomLevel(id: number): void {
  try {
    const existing = getCustomLevels().filter((l) => l.id !== id);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to delete custom level', e);
  }
}
