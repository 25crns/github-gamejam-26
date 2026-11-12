import { Player, Platform, Spike, DoorWall } from './types';
import { sound } from '../audio/soundEngine';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  shift: boolean;
}

export interface PhysicsParams {
  gravity: number;
  maxFallSpeed: number;
  accel: number;
  friction: number;
  maxSpeed: number;
  jumpImpulse: number;
}

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: 0.46,
  maxFallSpeed: 10.5,
  accel: 0.9,
  friction: 0.8,
  maxSpeed: 4.2,
  jumpImpulse: -9.5,
};

/**
 * Checks AABB intersection between two rectangles.
 */
export function checkAABB(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * Updates player physics for a single frame.
 */
export function updatePlayer(
  player: Player,
  inputs: InputState,
  platforms: Platform[],
  spikes: Spike[],
  door: DoorWall,
  physics: PhysicsParams = DEFAULT_PHYSICS,
  onDeath?: () => void,
  onWin?: () => void,
  options?: { isObjectiveShiftLeft?: boolean }
): { playerDied: boolean; levelWon: boolean } {
  let playerDied = false;
  let levelWon = false;

  if (player.isDead) {
    player.respawnTimer--;
    if (player.respawnTimer <= 0) {
      player.isDead = false;
    }
    return { playerDied: false, levelWon: false };
  }

  // --- Auto-Walking Mode (Work Shift / Idle Timeout) ---
  if (player.isAutoWalking) {
    player.vx = 2.4;
    player.facing = 'right';
    player.x += player.vx;

    // Auto-walk reaches right edge to win
    if (player.x + player.width >= door.x + 8) {
      levelWon = true;
      sound.playLevelComplete();
      if (onWin) onWin();
      return { playerDied: false, levelWon: true };
    }

    // Still apply gravity and platform landing while strolling
    player.vy += physics.gravity;
    if (player.vy > physics.maxFallSpeed) player.vy = physics.maxFallSpeed;
    player.y += player.vy;

    for (const plat of platforms) {
      if (plat.isBackgroundBridge && (plat.opacity ?? 0) < 0.6) continue;
      if (checkAABB(player, plat)) {
        if (player.vy > 0) {
          player.y = plat.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
        }
      }
    }
    return { playerDied: false, levelWon: false };
  }

  // --- Normal Horizontal acceleration ---
  if (inputs.left && !inputs.right) {
    player.vx -= physics.accel;
    if (player.vx < -physics.maxSpeed) player.vx = -physics.maxSpeed;
    player.facing = 'left';
  } else if (inputs.right && !inputs.left) {
    player.vx += physics.accel;
    if (player.vx > physics.maxSpeed) player.vx = physics.maxSpeed;
    player.facing = 'right';
  } else {
    player.vx *= physics.friction;
    if (Math.abs(player.vx) < 0.05) player.vx = 0;
  }

  // --- Jump logic ---
  if (inputs.jump && player.isGrounded) {
    player.vy = physics.jumpImpulse;
    player.isGrounded = false;
    sound.playJump();
  }

  // Variable jump dampening when releasing jump key mid-air
  if (!inputs.jump && player.vy < -2.5) {
    player.vy *= 0.65;
  }

  // --- Apply Gravity ---
  player.vy += physics.gravity;
  if (player.vy > physics.maxFallSpeed) player.vy = physics.maxFallSpeed;

  // --- Horizontal Movement & Platform Side Collision ---
  const prevX = player.x;
  player.x += player.vx;

  // Check Objective Shift (walk off left edge to win!)
  if (options?.isObjectiveShiftLeft && player.x <= 5) {
    levelWon = true;
    sound.playLevelComplete();
    if (onWin) onWin();
    return { playerDied: false, levelWon: true };
  }

  // Normal Left boundary
  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  }

  // Check right wall & door
  if (player.x + player.width >= door.x) {
    const isPlayerInDoorGap =
      player.y + player.height > door.y && player.y < door.y + door.height;

    // Door is open only when isOpen is true AND close animation has completed
    if (door.isOpen && isPlayerInDoorGap) {
      if (player.x + player.width >= door.x + 8) {
        levelWon = true;
        sound.playLevelComplete();
        if (onWin) onWin();
        return { playerDied: false, levelWon: true };
      }
    } else {
      // Blocked by solid right wall or closed sliding dashed gate
      player.x = door.x - player.width;
      player.vx = 0;
    }
  }

  // Solid platform side collision
  for (const plat of platforms) {
    // Skip ghost background bridge if not in focus
    if (plat.isBackgroundBridge && (plat.opacity ?? 0) < 0.6) continue;

    if (checkAABB(player, plat)) {
      if (player.vx > 0) {
        player.x = plat.x - player.width;
        player.vx = 0;
      } else if (player.vx < 0) {
        player.x = plat.x + plat.width;
        player.vx = 0;
      }
    }
  }

  // --- Vertical Movement & Platform Collision ---
  const prevY = player.y;
  player.y += player.vy;
  const wasGrounded = player.isGrounded;
  player.isGrounded = false;

  for (const plat of platforms) {
    // Skip ghost background bridge if not in focus
    if (plat.isBackgroundBridge && (plat.opacity ?? 0) < 0.6) continue;

    if (checkAABB(player, plat)) {
      // Falling down onto platform top
      if (player.vy > 0 && prevY + player.height <= plat.y + 12) {
        player.y = plat.y - player.height;
        player.vy = 0;
        player.isGrounded = true;
        if (!wasGrounded) {
          sound.playLand();
        }
      }
      // Bumping head against bottom of platform
      else if (player.vy < 0 && prevY >= plat.y + plat.height - 12) {
        player.y = plat.y + plat.height;
        player.vy = 0;
      }
    }
  }

  // Bottom Void Death
  if (player.y > 470) {
    playerDied = true;
    player.isDead = true;
    player.respawnTimer = 20;
    sound.playSpikeDeath();
    if (onDeath) onDeath();
    return { playerDied: true, levelWon: false };
  }

  // --- Spike Hazard Collision ---
  const playerHitbox = {
    x: player.x + 3,
    y: player.y + 3,
    width: player.width - 6,
    height: player.height - 6,
  };

  for (const spike of spikes) {
    if (checkAABB(playerHitbox, spike)) {
      playerDied = true;
      player.isDead = true;
      player.respawnTimer = 22;
      sound.playSpikeDeath();
      if (onDeath) onDeath();
      return { playerDied: true, levelWon: false };
    }
  }

  return { playerDied, levelWon };
}
