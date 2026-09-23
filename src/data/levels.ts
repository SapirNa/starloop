import type { Level } from '../types/level';
import { buildLevel, type LevelDefinition } from './levelBuilder';

const WORLD_1 = 'world-1';
const WORLD_2 = 'world-2';

// Every level moves - even Level 1, just very slowly (movementSpeed ramps
// from ~8 to ~30 px/sec across the set). Difficulty is built from many
// small levers (star count, speed, star-type mix/size, requirement
// thresholds, timeLimit, maxLoops, gold/bomb presence) and only a couple
// move at once per level - see the block comments below for the intended
// identity of each 5-level group. Occasional "breather" levels sit right
// after a new mechanic is introduced or a harder capstone, so difficulty
// isn't a strict staircase.
const LEVEL_DEFINITIONS: LevelDefinition[] = [
  // --- 1-5: Introduction - Capture, Score, simple Combo, very slow stars ---
  {
    id: 'level-1',
    worldId: WORLD_1,
    name: 'First Loop',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 3,
    starTypes: ['NORMAL'],
    movementSpeed: 8,
    rewardCoins: 10,
  },
  {
    id: 'level-2',
    worldId: WORLD_1,
    name: 'Steady Hand',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 4,
    starTypes: ['NORMAL'],
    movementSpeed: 10,
    rewardCoins: 10,
  },
  {
    id: 'level-3',
    worldId: WORLD_1,
    name: 'Score Starter',
    requirements: [{ type: 'SCORE', target: 35 }],
    starCount: 5,
    starTypes: ['NORMAL'],
    movementSpeed: 11,
    rewardCoins: 12,
  },
  {
    id: 'level-4',
    worldId: WORLD_1,
    name: 'Double Up',
    requirements: [{ type: 'BIG_LOOP', minStars: 2 }],
    starCount: 6,
    starTypes: ['NORMAL', 'NORMAL', 'GOLD'],
    movementSpeed: 12,
    rewardCoins: 12,
  },
  {
    id: 'level-5',
    worldId: WORLD_1,
    name: 'Five Points',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 7,
    starTypes: ['NORMAL', 'NORMAL', 'GOLD'],
    movementSpeed: 13,
    rewardCoins: 15,
  },

  // --- 6-10: Loop Skill - larger captures, stronger combos, Limited Loops ---
  {
    id: 'level-6',
    worldId: WORLD_1,
    name: 'Crowded Sky',
    requirements: [{ type: 'CAPTURE', count: 7 }],
    starCount: 9,
    starTypes: ['NORMAL', 'NORMAL', 'GOLD'],
    movementSpeed: 15,
    rewardCoins: 18,
  },
  {
    id: 'level-7',
    worldId: WORLD_1,
    name: 'Triple Combo',
    requirements: [{ type: 'BIG_LOOP', minStars: 3 }],
    starCount: 9,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 16,
    rewardCoins: 18,
  },
  {
    id: 'level-8',
    worldId: WORLD_1,
    name: 'Loop Economy',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 8,
    starTypes: ['NORMAL', 'GOLD', 'TINY'],
    movementSpeed: 14,
    maxLoops: 5,
    rewardCoins: 20,
  },
  {
    id: 'level-9',
    worldId: WORLD_1,
    name: 'Big Combo',
    requirements: [{ type: 'BIG_LOOP', minStars: 4 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 17,
    rewardCoins: 22,
  },
  {
    id: 'level-10',
    worldId: WORLD_1,
    name: 'Tight Loops',
    requirements: [{ type: 'CAPTURE', count: 8 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD', 'TINY'],
    movementSpeed: 16,
    maxLoops: 5,
    rewardCoins: 22,
  },

  // --- 11-15: Gold Stars - Gold Hunt, mixed with score/combo objectives ---
  {
    id: 'level-11',
    worldId: WORLD_1,
    name: 'Gold Rush',
    requirements: [{ type: 'GOLD_HUNT', count: 3 }],
    starCount: 8,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 15,
    rewardCoins: 22,
  },
  {
    id: 'level-12',
    worldId: WORLD_1,
    name: 'Treasure Field',
    requirements: [{ type: 'SCORE', target: 130 }],
    starCount: 9,
    starTypes: ['NORMAL', 'GOLD', 'GOLD'],
    movementSpeed: 17,
    rewardCoins: 24,
  },
  {
    id: 'level-13',
    worldId: WORLD_1,
    name: 'Gilded Combo',
    requirements: [{ type: 'BIG_LOOP', minStars: 3 }],
    starCount: 9,
    starTypes: ['GOLD', 'NORMAL'],
    movementSpeed: 18,
    rewardCoins: 24,
  },
  {
    id: 'level-14',
    worldId: WORLD_1,
    name: 'Gold Digger',
    requirements: [{ type: 'GOLD_HUNT', count: 4 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 19,
    rewardCoins: 26,
  },
  {
    id: 'level-15',
    worldId: WORLD_1,
    name: 'Vault of Stars',
    requirements: [{ type: 'SCORE', target: 130 }],
    starCount: 10,
    starTypes: ['GOLD', 'NORMAL'],
    movementSpeed: 18,
    rewardCoins: 28,
  },

  // --- 16-20: Time Pressure - Time Attack, timers tighten gradually ---
  {
    id: 'level-16',
    worldId: WORLD_1,
    name: 'Against the Clock',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 6,
    starTypes: ['NORMAL', 'TIME'],
    movementSpeed: 15,
    timeLimit: 40,
    rewardCoins: 22,
  },
  {
    id: 'level-17',
    worldId: WORLD_1,
    name: 'Quick Hands',
    requirements: [{ type: 'CAPTURE', count: 6 }],
    starCount: 8,
    starTypes: ['NORMAL', 'TIME'],
    movementSpeed: 17,
    timeLimit: 35,
    rewardCoins: 24,
  },
  {
    id: 'level-18',
    worldId: WORLD_1,
    name: 'Score Sprint',
    requirements: [{ type: 'SCORE', target: 80 }],
    starCount: 8,
    starTypes: ['NORMAL', 'SPEED', 'GOLD'],
    movementSpeed: 18,
    timeLimit: 30,
    rewardCoins: 26,
  },
  {
    id: 'level-19',
    worldId: WORLD_1,
    name: 'Golden Minute',
    requirements: [{ type: 'GOLD_HUNT', count: 3 }],
    starCount: 9,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 19,
    timeLimit: 30,
    rewardCoins: 28,
  },
  {
    id: 'level-20',
    worldId: WORLD_1,
    name: 'Tight Timer',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD', 'TIME'],
    movementSpeed: 19,
    timeLimit: 25,
    rewardCoins: 30,
  },

  // --- 21-25: Bombs - avoidance, one bomb to start, careful escalation ---
  {
    id: 'level-21',
    worldId: WORLD_1,
    name: 'First Spark',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 7,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 15,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 25,
  },
  {
    id: 'level-22',
    worldId: WORLD_1,
    name: 'Careful Score',
    requirements: [{ type: 'SCORE', target: 55 }],
    starCount: 8,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 17,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 28,
  },
  {
    id: 'level-23',
    worldId: WORLD_1,
    name: 'Danger Zone',
    requirements: [{ type: 'CAPTURE', count: 7 }],
    starCount: 9,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 18,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 30,
  },
  {
    id: 'level-24',
    worldId: WORLD_1,
    name: 'Risky Combo',
    requirements: [{ type: 'BIG_LOOP', minStars: 3 }],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 19,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 32,
  },
  {
    id: 'level-25',
    worldId: WORLD_1,
    name: 'Minefield',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 18,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 35,
  },

  // --- 26-30: Precision - smaller/faster stars, Big Loop, mixed motion ---
  {
    id: 'level-26',
    worldId: WORLD_1,
    name: 'Small Targets',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 8,
    starTypes: ['NORMAL', 'TINY'],
    movementSpeed: 20,
    rewardCoins: 28,
  },
  {
    id: 'level-27',
    worldId: WORLD_1,
    name: 'Sharp Focus',
    requirements: [{ type: 'BIG_LOOP', minStars: 3 }],
    starCount: 9,
    starTypes: ['TINY', 'NORMAL', 'SPEED'],
    movementSpeed: 22,
    rewardCoins: 30,
  },
  {
    id: 'level-28',
    worldId: WORLD_1,
    name: 'Fine Print',
    requirements: [{ type: 'CAPTURE', count: 8 }],
    starCount: 10,
    starTypes: ['TINY', 'TINY', 'NORMAL'],
    movementSpeed: 23,
    rewardCoins: 32,
  },
  {
    id: 'level-29',
    worldId: WORLD_1,
    name: 'Steady Nerves',
    requirements: [{ type: 'BIG_LOOP', minStars: 4 }],
    starCount: 10,
    starTypes: ['TINY', 'NORMAL', 'SPEED'],
    movementSpeed: 24,
    rewardCoins: 34,
  },
  {
    id: 'level-30',
    worldId: WORLD_1,
    name: 'Pinpoint',
    requirements: [{ type: 'SCORE', target: 120 }],
    starCount: 10,
    starTypes: ['TINY', 'NORMAL', 'SPEED', 'GOLD'],
    movementSpeed: 25,
    rewardCoins: 36,
  },

  // --- 31-40: Combined Skill - two mechanics at once ---
  {
    id: 'level-31',
    worldId: WORLD_1,
    name: 'Gold Against Time',
    requirements: [{ type: 'GOLD_HUNT', count: 4 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 20,
    timeLimit: 35,
    rewardCoins: 30,
  },
  {
    id: 'level-32',
    worldId: WORLD_1,
    name: 'Efficient Scoring',
    requirements: [{ type: 'SCORE', target: 140 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 22,
    maxLoops: 5,
    rewardCoins: 32,
  },
  {
    id: 'level-33',
    worldId: WORLD_1,
    name: 'Combo Under Fire',
    requirements: [{ type: 'BIG_LOOP', minStars: 3 }],
    starCount: 9,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 20,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 30,
  },
  {
    id: 'level-34',
    worldId: WORLD_1,
    name: 'Triple Threat',
    requirements: [{ type: 'CAPTURE', count: 8 }],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 23,
    timeLimit: 35,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 34,
  },
  {
    id: 'level-35',
    worldId: WORLD_1,
    name: 'Gold Economy',
    requirements: [{ type: 'GOLD_HUNT', count: 4 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 23,
    maxLoops: 5,
    rewardCoins: 34,
  },
  {
    id: 'level-36',
    worldId: WORLD_1,
    name: 'Blast Radius',
    requirements: [{ type: 'SCORE', target: 60 }],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 24,
    timeLimit: 30,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 36,
  },
  {
    id: 'level-37',
    worldId: WORLD_1,
    name: 'Breathing Room',
    requirements: [{ type: 'BIG_LOOP', minStars: 4 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 22,
    timeLimit: 35,
    rewardCoins: 32,
  },
  {
    id: 'level-38',
    worldId: WORLD_1,
    name: 'Careful Count',
    requirements: [{ type: 'CAPTURE', count: 8 }],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 24,
    // Was maxLoops: 4, which demanded a flawless 2-captures-per-loop run
    // across every single loop - zero margin for even one below-par loop,
    // unlike every sibling maxLoops level (all sit around an
    // 8-captures-per-5-loops ratio). 5 restores that same headroom for a
    // below-par (but bomb-free) loop; a bomb itself still ends the
    // attempt outright, same as every other level now that bombPenalty is
    // uniformly FAIL_LEVEL - see the useGameStore.test.ts coverage below.
    maxLoops: 5,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 36,
  },
  {
    id: 'level-39',
    worldId: WORLD_1,
    name: 'Golden Fuse',
    requirements: [{ type: 'GOLD_HUNT', count: 4 }],
    starCount: 10,
    starTypes: ['GOLD', 'NORMAL', 'GOLD', 'BOMB'],
    movementSpeed: 25,
    timeLimit: 30,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 38,
  },
  {
    id: 'level-40',
    worldId: WORLD_1,
    name: 'Three-Way Test',
    requirements: [{ type: 'SCORE', target: 170 }],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 24,
    timeLimit: 40,
    maxLoops: 6,
    rewardCoins: 40,
  },

  // --- 41-50: Advanced - MIXED objectives, real mastery ---
  {
    id: 'level-41',
    worldId: WORLD_1,
    name: 'Two Goals',
    requirements: [
      { type: 'CAPTURE', count: 8 },
      { type: 'SCORE', target: 100 },
    ],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 24,
    rewardCoins: 38,
  },
  {
    id: 'level-42',
    worldId: WORLD_1,
    name: 'Gold and Combo',
    requirements: [
      { type: 'GOLD_HUNT', count: 4 },
      { type: 'BIG_LOOP', minStars: 3 },
    ],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 26,
    timeLimit: 35,
    rewardCoins: 40,
  },
  {
    id: 'level-43',
    worldId: WORLD_1,
    name: 'Around the Danger',
    requirements: [
      { type: 'CAPTURE', count: 8 },
      { type: 'BIG_LOOP', minStars: 3 },
    ],
    starCount: 10,
    starTypes: ['NORMAL', 'NORMAL', 'NORMAL', 'BOMB'],
    movementSpeed: 24,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 38,
  },
  {
    id: 'level-44',
    worldId: WORLD_1,
    name: 'Efficient Hunt',
    requirements: [
      { type: 'SCORE', target: 150 },
      { type: 'GOLD_HUNT', count: 4 },
    ],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 26,
    maxLoops: 5,
    rewardCoins: 42,
  },
  {
    id: 'level-45',
    worldId: WORLD_1,
    name: 'Steady Mastery',
    requirements: [
      { type: 'CAPTURE', count: 9 },
      { type: 'SCORE', target: 85 },
    ],
    starCount: 11,
    starTypes: ['NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'BOMB'],
    movementSpeed: 25,
    timeLimit: 35,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 40,
  },
  {
    id: 'level-46',
    worldId: WORLD_1,
    name: 'Vault Runner',
    requirements: [
      { type: 'BIG_LOOP', minStars: 4 },
      { type: 'GOLD_HUNT', count: 5 },
    ],
    starCount: 11,
    starTypes: ['GOLD', 'NORMAL', 'GOLD', 'BOMB'],
    movementSpeed: 27,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 44,
  },
  {
    id: 'level-47',
    worldId: WORLD_1,
    name: 'Clean Run',
    requirements: [
      { type: 'CAPTURE', count: 9 },
      { type: 'BIG_LOOP', minStars: 3 },
    ],
    starCount: 10,
    starTypes: ['NORMAL', 'GOLD'],
    movementSpeed: 25,
    timeLimit: 35,
    maxLoops: 5,
    rewardCoins: 42,
  },
  {
    id: 'level-48',
    worldId: WORLD_1,
    name: 'High Value Target',
    requirements: [
      { type: 'SCORE', target: 160 },
      { type: 'GOLD_HUNT', count: 5 },
    ],
    starCount: 11,
    starTypes: ['GOLD', 'NORMAL', 'GOLD', 'BOMB'],
    movementSpeed: 27,
    timeLimit: 35,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 46,
  },
  {
    id: 'level-49',
    worldId: WORLD_1,
    name: 'Full Mastery',
    requirements: [
      { type: 'CAPTURE', count: 9 },
      { type: 'GOLD_HUNT', count: 5 },
      { type: 'BIG_LOOP', minStars: 3 },
    ],
    starCount: 11,
    starTypes: ['GOLD', 'NORMAL', 'GOLD', 'BOMB'],
    movementSpeed: 28,
    maxLoops: 6,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 48,
  },
  {
    id: 'level-50',
    worldId: WORLD_1,
    name: 'Finale',
    requirements: [
      { type: 'SCORE', target: 180 },
      { type: 'GOLD_HUNT', count: 5 },
      { type: 'BIG_LOOP', minStars: 4 },
    ],
    starCount: 11,
    starTypes: ['GOLD', 'NORMAL', 'GOLD', 'BOMB'],
    movementSpeed: 28,
    timeLimit: 40,
    maxLoops: 6,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 60,
  },

  // ============================================================
  // MOONLIGHT SKY (world-2) - levels 51-70. Deliberately harder than
  // Star Garden throughout (higher star counts, tighter ratios, bigger
  // objectives), rising gradually rather than every level topping the
  // last one in every lever - see the per-block comments below. Every
  // level moves (no stationary levels), same as Star Garden. All
  // requirement targets, Gold Star counts, and combo sizes below are kept
  // to real, verified-achievable numbers against this project's actual
  // scoring formula (see utils/scoring.ts: NORMAL=10, GOLD=25, TINY=15,
  // combo multiplier up to 3x at 5+ stars) - not the round "thousands"
  // figures from the original design brief, which assumed a different,
  // much larger per-star scale than this engine actually uses.
  // ------------------------------------------------------------

  // --- 51-53: Easy introduction to Moonlight Sky ---
  {
    id: 'level-51',
    worldId: WORLD_2,
    name: 'Moonlight Welcome',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 10,
    starTypes: ['NORMAL'],
    movementSpeed: 18,
    rewardCoins: 50,
  },
  {
    id: 'level-52',
    worldId: WORLD_2,
    name: 'Night Collector',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 15,
    starTypes: ['NORMAL'],
    movementSpeed: 20,
    rewardCoins: 53,
  },
  {
    id: 'level-53',
    worldId: WORLD_2,
    name: 'Moon Combo',
    requirements: [{ type: 'COMBO', comboCount: 3, minComboSize: 3 }],
    starCount: 12,
    starTypes: ['NORMAL'],
    movementSpeed: 20,
    rewardCoins: 55,
  },

  // --- 54-57: Medium ---
  {
    id: 'level-54',
    worldId: WORLD_2,
    name: 'Shooting Stars',
    // maxScore = 14*10 = 140; target 100 (~0.71) rewards multi-star loops
    // over one-at-a-time capturing without demanding a flawless run.
    requirements: [{ type: 'SCORE', target: 100 }],
    starCount: 14,
    starTypes: ['NORMAL'],
    movementSpeed: 21,
    rewardCoins: 58,
  },
  {
    id: 'level-55',
    worldId: WORLD_2,
    name: 'Golden Moon',
    // 12 NORMAL + 5 GOLD - one spare Gold beyond the 4 required.
    requirements: [{ type: 'GOLD_HUNT', count: 4 }],
    starCount: 17,
    starTypes: [
      'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL',
    ],
    movementSpeed: 21,
    rewardCoins: 60,
  },
  {
    id: 'level-56',
    worldId: WORLD_2,
    name: 'Five Loops',
    // 14 of 16 available - a 2-star cushion so one below-par loop is
    // still recoverable, unlike the old zero-margin level-38 balance.
    requirements: [{ type: 'CAPTURE', count: 14 }],
    starCount: 16,
    starTypes: ['NORMAL'],
    movementSpeed: 21,
    maxLoops: 5,
    rewardCoins: 62,
  },
  {
    id: 'level-57',
    worldId: WORLD_2,
    name: 'Moon Rush',
    requirements: [{ type: 'CAPTURE', count: 15 }],
    starCount: 18,
    starTypes: ['NORMAL'],
    movementSpeed: 22,
    timeLimit: 45,
    rewardCoins: 64,
  },

  // --- 58-60: Medium+ ---
  {
    id: 'level-58',
    worldId: WORLD_2,
    name: 'Combo Hunter',
    requirements: [{ type: 'COMBO', comboCount: 3, minComboSize: 4 }],
    starCount: 16,
    starTypes: ['NORMAL'],
    movementSpeed: 23,
    rewardCoins: 66,
  },
  {
    id: 'level-59',
    worldId: WORLD_2,
    name: 'First Danger',
    // The first bomb level in Moonlight Sky - one bomb only, and
    // SCORE_PENALTY (not FAIL_LEVEL) so the introduction stays forgiving,
    // mirroring how Star Garden eases into bombs (level-21 "First Spark").
    requirements: [{ type: 'CAPTURE', count: 15 }],
    starCount: 17,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
      'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
    ],
    movementSpeed: 22,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 68,
  },
  {
    id: 'level-60',
    worldId: WORLD_2,
    name: 'Half Moon Challenge',
    // Moonlight Sky's first milestone: three objectives at once, still
    // with a gentle SCORE_PENALTY bomb (FAIL_LEVEL bombs start at 64).
    // maxScore = 18*10 + 2*25 = 230; target 150 (~0.65).
    requirements: [
      { type: 'CAPTURE', count: 15 },
      { type: 'SCORE', target: 150 },
      { type: 'COMBO', comboCount: 1, minComboSize: 4 },
    ],
    starCount: 21,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL',
    ],
    movementSpeed: 22,
    bombPenalty: 'SCORE_PENALTY',
    rewardCoins: 75,
  },

  // --- 61-63: Medium+ -> Hard ---
  {
    id: 'level-61',
    worldId: WORLD_2,
    name: 'Fast Moon',
    requirements: [{ type: 'CAPTURE', count: 20 }],
    starCount: 22,
    starTypes: ['NORMAL'],
    movementSpeed: 24,
    rewardCoins: 78,
  },
  {
    id: 'level-62',
    worldId: WORLD_2,
    name: 'Golden Rush',
    // 15 NORMAL + 7 GOLD - one spare Gold beyond the 6 required.
    requirements: [{ type: 'GOLD_HUNT', count: 6 }],
    starCount: 22,
    starTypes: [
      'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'GOLD', 'NORMAL',
    ],
    movementSpeed: 23,
    timeLimit: 45,
    rewardCoins: 82,
  },
  {
    id: 'level-63',
    worldId: WORLD_2,
    name: 'Precision Loops',
    // 20 of 22 available (2-star cushion). TINY stars for "smaller
    // targets" - deliberately requires ~4 stars/loop on average, the
    // level's whole point (unlike level-38's old balance, there's no
    // bomb risk compounding it, and the 2-star buffer still allows one
    // below-average loop).
    requirements: [{ type: 'CAPTURE', count: 20 }],
    starCount: 22,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'TINY', 'TINY',
    ],
    movementSpeed: 24,
    maxLoops: 5,
    rewardCoins: 85,
  },

  // --- 64-66: Hard ---
  {
    id: 'level-64',
    worldId: WORLD_2,
    name: 'Bomb Field',
    // 20 of 23 collectible-adjacent stars (2-star cushion), 3 Bombs.
    // FAIL_LEVEL from here on - this is where Moonlight Sky's bombs stop
    // being forgiving.
    requirements: [{ type: 'CAPTURE', count: 18 }],
    starCount: 23,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'BOMB',
      'NORMAL', 'NORMAL',
    ],
    movementSpeed: 25,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 88,
  },
  {
    id: 'level-65',
    worldId: WORLD_2,
    name: 'Super Combo',
    // "2 loops of 6+ collectible stars each" is COMBO semantics in this
    // engine (BIG_LOOP is a single-loop running-max check) - see
    // types/objective.ts.
    requirements: [{ type: 'COMBO', comboCount: 2, minComboSize: 6 }],
    starCount: 24,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'BOMB',
    ],
    movementSpeed: 25,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 90,
  },
  {
    id: 'level-66',
    worldId: WORLD_2,
    name: 'Moonlight Clock',
    // maxScore = 22*10 + 4*25 = 320; target 230 (~0.72).
    requirements: [{ type: 'SCORE', target: 230 }],
    starCount: 27,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'BOMB',
    ],
    movementSpeed: 27,
    timeLimit: 40,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 92,
  },

  // --- 67-68: Hard+ ---
  {
    id: 'level-67',
    worldId: WORLD_2,
    name: 'Four Perfect Chances',
    // maxScore = 20*10 + 4*25 = 300; target 220 (~0.73). A SCORE goal
    // (not a fixed capture count) under maxLoops:4 leaves the player free
    // to choose which/how many stars to chase per loop.
    requirements: [{ type: 'SCORE', target: 220 }],
    starCount: 26,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'BOMB',
    ],
    movementSpeed: 26,
    maxLoops: 4,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 95,
  },
  {
    id: 'level-68',
    worldId: WORLD_2,
    name: 'Lunar Chaos',
    // 20 of 28 collectible (22 NORMAL + 6 GOLD) - generous cushion since
    // three objectives must land together. 4 of 6 Gold required.
    requirements: [
      { type: 'CAPTURE', count: 20 },
      { type: 'GOLD_HUNT', count: 4 },
      { type: 'COMBO', comboCount: 1, minComboSize: 5 },
    ],
    starCount: 31,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD', 'GOLD', 'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD', 'GOLD', 'BOMB',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD', 'GOLD', 'BOMB',
      'NORMAL',
    ],
    movementSpeed: 27,
    timeLimit: 50,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 98,
  },

  // --- 69: Very Hard ---
  {
    id: 'level-69',
    worldId: WORLD_2,
    name: 'Moon Master',
    // maxScore = 24*10 + 5*25 = 365; target 260 (~0.71). 4 Bombs, and the
    // combo requirement (3 loops of 5+) naturally carries most of the
    // score too - reaching it is realistic within 7 loops, not just
    // theoretically possible.
    requirements: [
      { type: 'SCORE', target: 260 },
      { type: 'COMBO', comboCount: 3, minComboSize: 5 },
    ],
    starCount: 33,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'GOLD', 'BOMB', 'BOMB', 'BOMB', 'BOMB',
    ],
    movementSpeed: 28,
    maxLoops: 7,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 102,
  },

  // --- 70: World Finale ---
  {
    id: 'level-70',
    worldId: WORLD_2,
    name: 'Full Moon Finale',
    // Combines every skill Moonlight Sky taught: capture volume, Gold
    // targeting, scoring efficiency, one big combo, bomb avoidance, a
    // timer, and a loop budget. maxScore = 25*10 + 7*25 = 425; target
    // 300 (~0.71). 25 of 32 collectible required (7-star cushion) and 5
    // of 7 Gold (2 spare) - demanding, but with real room for a mistake,
    // not a flawless-only run.
    requirements: [
      { type: 'CAPTURE', count: 25 },
      { type: 'GOLD_HUNT', count: 5 },
      { type: 'SCORE', target: 300 },
      { type: 'COMBO', comboCount: 1, minComboSize: 6 },
    ],
    starCount: 36,
    starTypes: [
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'GOLD',
      'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
      'BOMB', 'BOMB', 'BOMB', 'BOMB',
    ],
    movementSpeed: 30,
    timeLimit: 55,
    maxLoops: 8,
    bombPenalty: 'FAIL_LEVEL',
    rewardCoins: 120,
  },
];

export const LEVELS: Level[] = LEVEL_DEFINITIONS.map(buildLevel);
