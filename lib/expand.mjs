// expand.mjs: The bridge between 1-screen rapid vertical-slice demos and
// full-featured production games. Handles demo approval, AI expansion blueprints,
// and automated multi-level architecture scaffolding.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { syncKit, REGISTRY } from './extras.mjs';

/**
 * Approve a vertical-slice demo, recording sign-off notes, target level count,
 * world themes, and unlocking full-game production.
 */
export function approveDemo(id, {
  notes = '',
  levels = 5,
  worlds = [],
  stars = true,
  shop = false,
  save = true,
  gamesDir = 'games',
  stateDir = '.gp',
  videoDir = 'press/video'
} = {}) {
  const gameDir = join(gamesDir, id);
  const gameFile = join(gameDir, 'index.html');
  if (!existsSync(gameFile)) {
    throw new Error(`cannot approve: game not found at ${gameFile}`);
  }

  // Load grade or status if available
  let grade = null;
  const gradeFile = join(stateDir, `${id}.grade.json`);
  if (existsSync(gradeFile)) {
    try { grade = JSON.parse(readFileSync(gradeFile, 'utf8')); } catch {}
  }

  // Detect recipe or lego from meta or source
  const src = readFileSync(gameFile, 'utf8');
  let engine = '2d';
  if (/gp3d|three\.module/.test(src)) engine = '3d';
  let recipe = null;
  const m = src.match(/\/\*RECIPE\s+([\w-]+)/);
  if (m) recipe = m[1];
  const isLego = /runLegoGame/.test(src);

  const numLevels = Math.max(1, Number(levels) || 5);
  const defaultWorlds = ['Meadow Hills', 'Desert Ruins', 'Neon Metro', 'Molten Peak', 'Sky Sanctum'];
  const worldList = worlds.length ? worlds : defaultWorlds.slice(0, Math.min(defaultWorlds.length, Math.ceil(numLevels / 2)));

  const approval = {
    id,
    approved: true,
    approvedAt: new Date().toISOString(),
    notes: notes || 'Demo approved for full multi-level expansion.',
    grade: grade ? { score: grade.score, pass: grade.pass } : null,
    demo: {
      engine,
      recipe: recipe || (isLego ? 'lego' : 'custom'),
      isLego
    },
    expansion: {
      levels: numLevels,
      worlds: worldList,
      features: {
        levels: true,
        stars: !!stars,
        shop: !!shop,
        save: !!save,
        pause: true,
        expandedWorld: true
      }
    }
  };

  mkdirSync(stateDir, { recursive: true });
  const approvalFile = join(stateDir, `${id}.approved.json`);
  writeFileSync(approvalFile, JSON.stringify(approval, null, 2));

  return { ok: true, id, file: approvalFile, approval };
}

/**
 * Retrieve approval data for a game.
 */
export function getApproval(id, stateDir = '.gp') {
  const file = join(stateDir, `${id}.approved.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * List all approved games.
 */
export function listApprovals(stateDir = '.gp') {
  if (!existsSync(stateDir)) return [];
  return readdirSync(stateDir)
    .filter(f => f.endsWith('.approved.json'))
    .map(f => {
      try {
        const d = JSON.parse(readFileSync(join(stateDir, f), 'utf8'));
        return { id: d.id, approvedAt: d.approvedAt, levels: d.expansion?.levels, worlds: d.expansion?.worlds, notes: d.notes };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Generate a token-saving blueprint for an AI to build out the full game.
 * Specifies exact level curves, world bounds, enemy compositions, and save schemas.
 */
export function generateBlueprint(id, {
  gamesDir = 'games',
  stateDir = '.gp',
  levels = null,
  worlds = []
} = {}) {
  const approval = getApproval(id, stateDir);
  const gameFile = join(gamesDir, id, 'index.html');
  const src = existsSync(gameFile) ? readFileSync(gameFile, 'utf8') : '';

  const numLevels = levels ? Number(levels) : (approval?.expansion?.levels || 5);
  const worldList = worlds.length ? worlds : (approval?.expansion?.worlds || ['Verdant Valley', 'Sunken Ruins', 'Astral Keep']);

  // Extract hero, foe, title if available
  let title = id.toUpperCase();
  const tm = src.match(/title:\s*['"]([^'"]+)['"]/);
  if (tm) title = tm[1];

  const levelsBlueprint = [];
  for (let i = 0; i < numLevels; i++) {
    const worldIndex = Math.min(worldList.length - 1, Math.floor(i / Math.ceil(numLevels / worldList.length)));
    const worldName = worldList[worldIndex];
    const isBoss = (i === numLevels - 1) || ((i + 1) % 3 === 0);
    const worldWidth = 540 + Math.min(3000, i * 600);
    const worldHeight = 960 + Math.min(1000, i * 200);

    levelsBlueprint.push({
      level: i + 1,
      name: `${worldName} - Stanza ${((i % 3) + 1)}`,
      world: worldName,
      isBoss,
      worldBounds: { w: worldWidth, h: worldHeight },
      difficultyMultiplier: +(1 + i * 0.25).toFixed(2),
      objectives: isBoss ? ['Defeat the World Titan', 'Survive all waves'] : [`Collect ${(i + 1) * 8} gems`, `Score ${(i + 1) * 500} pts`],
      starThresholds: {
        star1: 'Clear the level',
        star2: `Score >= ${(i + 1) * 600} pts`,
        star3: `Complete within ${Math.max(15, 35 - i * 2)}s`
      }
    });
  }

  const blueprint = {
    id,
    title,
    approvalStatus: approval ? 'APPROVED' : 'PENDING_APPROVAL',
    notes: approval?.notes || 'Standard expansion',
    totalLevels: numLevels,
    worlds: worldList,
    saveSystem: {
      storageKey: `gp-save-${id}`,
      schema: {
        unlockedLevel: 'number (1-indexed)',
        stars: 'map<levelIndex, 1..3>',
        highScores: 'map<levelIndex, number>',
        totalCoins: 'number',
        upgrades: 'map<string, number>'
      }
    },
    levels: levelsBlueprint,
    aiGuidance: [
      'Maintain existing verified player control scheme and touch response.',
      'Import { createLevelManager, createCamera } from "../_vendor/gplevels.js".',
      'Use camera.follow(player.x, player.y, dt) with camera.apply(ctx) / camera.restore(ctx) for expanded worlds.',
      'Call levelMgr.completeLevel({ score, stars, coins }) upon reaching the level goal.',
      'Call levelMgr.failLevel({ score }) upon player defeat.',
      'Render levelMgr.drawWinModal(ctx) and levelMgr.drawLevelSelect(ctx) in the draw loop.'
    ]
  };

  return blueprint;
}

/**
 * Automatically scaffold expansion into an existing game's index.html.
 * Injects gplevels.js, sets up the levels array, and wraps win/fail conditions.
 */
export function scaffoldExpansion(id, {
  gamesDir = 'games',
  stateDir = '.gp',
  levels = 5,
  worlds = []
} = {}) {
  const gameDir = join(gamesDir, id);
  const gameFile = join(gameDir, 'index.html');
  if (!existsSync(gameFile)) {
    throw new Error(`cannot expand: game not found at ${gameFile}`);
  }

  // Backup original demo if not yet backed up
  const backupFile = join(gameDir, 'index.demo.html');
  if (!existsSync(backupFile)) {
    copyFileSync(gameFile, backupFile);
  }

  // Sync kit to ensure _vendor/gplevels.js exists
  syncKit(gamesDir);

  const blueprint = generateBlueprint(id, { gamesDir, stateDir, levels, worlds });
  let src = readFileSync(gameFile, 'utf8');

  // Inject gplevels import if not already present
  if (!src.includes('gplevels.js')) {
    src = src.replace(
      /from\s+['"]\.\.\/_vendor\/gp2d\.js['"];/,
      `from '../_vendor/gp2d.js';\nimport { createLevelManager, createCamera } from '../_vendor/gplevels.js';`
    );
  }

  // Check if LEVELS array is already declared
  if (!src.includes('const LEVELS =')) {
    const levelsJson = JSON.stringify(blueprint.levels.map(l => ({
      id: l.level,
      name: l.name,
      world: l.world,
      bounds: l.worldBounds,
      goal: l.objectives[0]
    })), null, 2);

    const injection = `
// --- EXPANDED MULTI-LEVEL PROGRESSION ---
const LEVELS = ${levelsJson};
const levelMgr = createLevelManager({
  id: '${id}',
  levels: LEVELS,
  onStartLevel: (lvl, idx) => { if (typeof init === 'function') init(); },
  onLevelWin: (res) => {},
  onLevelFail: (res) => {}
});
`;
    // Insert after createGame or spec definition
    if (src.includes('const g = createGame(')) {
      src = src.replace(/const g = createGame\([^)]*\);/, match => `${match}\n${injection}`);
    } else {
      src = src.replace('<script type="module">', `<script type="module">\n${injection}`);
    }
  }

  writeFileSync(gameFile, src);

  return {
    ok: true,
    id,
    gameFile,
    backup: backupFile,
    levels: blueprint.totalLevels,
    blueprint
  };
}
