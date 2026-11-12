import { LevelData, Platform, Spike, DoorWall } from './types';

/**
 * Creates the uniform base layout identical across all levels.
 * Dimensions fit the 800x450 viewport.
 * The door is a vertical wall along the right edge with a door gap.
 */
export function createBaseLayout(): {
  playerStart: { x: number; y: number };
  door: DoorWall;
  platforms: Platform[];
  spikes: Spike[];
} {
  const playerStart = { x: 50, y: 320 };

  // Common clean platforms without any text or labels
  const platforms: Platform[] = [
    // Left starting ground
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
    // Right exit ground (extends to the right wall at x=785)
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
    // Mid-air lower platform 1
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
    // Mid-air upper platform 2
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
    // Pit floor platform (below spikes)
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

  // Common spikes
  const spikes: Spike[] = [
    // Lethal spikes across the central pit
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
    // Obstacle spikes on platform-mid-2
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

  // Vertical wall line on the right edge (x=785), with a door gap from y=280 to y=370 (height 90)
  const door: DoorWall = {
    x: 785,
    y: 280,
    height: 90,
    isOpen: false,
  };

  return { playerStart, door, platforms, spikes };
}

/**
 * Returns Level Data for the given level index (1, 2, or 3).
 * Identical layout and clean presentation without hints or spoilers.
 */
export function getLevelData(levelNum: number): LevelData {
  const customLevels = getCustomLevels();
  const custom = customLevels.find((l) => l.id === levelNum);
  if (custom) {
    return JSON.parse(JSON.stringify(custom));
  }

  const base = createBaseLayout();

  switch (levelNum) {
    case 1:
      return {
        id: 1,
        title: 'LEVEL 01',
        shiftType: 'KEY_SHIFT',
        playerStart: base.playerStart,
        door: base.door,
        platforms: base.platforms,
        spikes: base.spikes,
      };

    case 2:
      return {
        id: 2,
        title: 'LEVEL 02',
        shiftType: 'GEOMETRY_SHIFT',
        playerStart: base.playerStart,
        door: base.door,
        platforms: base.platforms,
        spikes: base.spikes,
      };

    case 3:
      return {
        id: 3,
        title: 'LEVEL 03',
        shiftType: 'TAB_SHIFT',
        playerStart: base.playerStart,
        door: base.door,
        platforms: base.platforms,
        spikes: base.spikes,
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
