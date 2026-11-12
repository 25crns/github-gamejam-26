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
  isBackgroundBridge?: boolean; // For Tilt-Shift level
  opacity?: number;
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
  closeAnimProgress?: number; // 0 to 1 for initial slide-down closing animation
}

export interface Player extends Rect {
  vx: number;
  vy: number;
  isGrounded: boolean;
  facing: 'left' | 'right';
  isDead: boolean;
  respawnTimer: number;
  isAutoWalking?: boolean; // For Work Shift idle timeout
}

export type ShiftType =
  | 'KEY_SHIFT'
  | 'TYPE_SHIFT'
  | 'CAPS_SHIFT'
  | 'CONTROLS_SHIFT'
  | 'OBJECTIVE_SHIFT'
  | 'GEOMETRY_SHIFT'
  | 'CLIPBOARD_SHIFT'
  | 'WORK_SHIFT'
  | 'TILT_SHIFT'
  | 'DUAL_SHIFT'
  | 'TAB_SHIFT'
  | 'URL_SHIFT'
  | 'ORIENTATION_SHIFT'
  | 'DUAL_WINDOW_SHIFT'
  | 'CUSTOM';

export interface LevelData {
  id: number;
  title: string;
  subtleTitle: string;
  hint: string;
  shiftType: ShiftType;
  shiftExplanation: string;
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
