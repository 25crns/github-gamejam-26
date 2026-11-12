/**
 * Types and interfaces for the SHIFT platformer game.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform extends Rect {
  id: string;
  originalX: number;
  originalY: number;
  isShiftable?: boolean;
  isShifted?: boolean;
  shiftOffsetX?: number;
  shiftOffsetY?: number;
}

export interface Spike extends Rect {
  id: string;
  originalX: number;
  originalY: number;
  count: number;
  isShiftable?: boolean;
  isShifted?: boolean;
  shiftOffsetX?: number;
  shiftOffsetY?: number;
}

export interface DoorWall {
  x: number; // Vertical wall position (e.g. 785)
  y: number; // Top of the door gap (e.g. 280)
  height: number; // Height of the door gap (e.g. 90)
  isOpen: boolean;
}

export interface Player extends Rect {
  vx: number;
  vy: number;
  isGrounded: boolean;
  facing: 'left' | 'right';
  isDead: boolean;
  respawnTimer: number;
}

export type ShiftType =
  | 'KEY_SHIFT'
  | 'TYPE_SHIFT'
  | 'CAPS_SHIFT'
  | 'CONTROLS_SHIFT'
  | 'GEOMETRY_SHIFT'
  | 'CLIPBOARD_SHIFT'
  | 'DUAL_SHIFT'
  | 'TAB_SHIFT'
  | 'URL_SHIFT'
  | 'CUSTOM';

export interface LevelData {
  id: number;
  title: string;
  shiftType: ShiftType;
  playerStart: { x: number; y: number };
  door: DoorWall;
  platforms: Platform[];
  spikes: Spike[];
  customMechanicNote?: string;
}

export interface GameStats {
  deaths: number;
  startTime: number;
  shiftsCount: number;
}
