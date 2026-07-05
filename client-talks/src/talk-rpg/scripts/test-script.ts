import { Action } from '../script'

/**
 * Phase 3 proving script: extends Phase 2's walk/walkTo/enterScene actions
 * with a named speaker, a thought bubble, a command menu, a status screen,
 * and a full-screen text card, proving the DOM overlay layer end to end.
 */
export const TEST_SCRIPT: Action[] = [
  // Phase 7 proving script: the cold open — a title screen composed purely
  // from Established `showOverlay`/`showMenu` vocabulary (no new action
  // type), then the save-file/"enhanced edition available" framing screen
  // via `showSaveFile`, per idea-board.md §3's `[LOCKED]` cold-open sequence.
  { type: 'showOverlay', kind: 'title', text: 'DRAGON WARRIOR' },
  { type: 'showMenu', menuKind: 'command', options: ['Start Game'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 0 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  { type: 'stop' },

  {
    type: 'showSaveFile',
    summary: 'GRANDMASTER ENGINEER — twenty years, one craft, ten thousand bugs slain. AI-Enhanced Edition available.',
  },
  { type: 'pause', seconds: 2 },
  { type: 'hideOverlay' },
  { type: 'stop' },

  // Phase 5 proving script: a scripted gold counter (a fixed-HUD 'counter'
  // meter, per design.md's "gold is a meterId, not a separate action type"
  // Decision) ticking up on later beats.
  { type: 'setMeter', meterId: 'gold', label: 'Gold', style: 'counter', value: 0 },
  { type: 'walk', entity: 'pc', path: [{ direction: 'right', steps: 3 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 2 }, { direction: 'right', steps: 2 }] },
  { type: 'startDialogue', speaker: 'Guide' },
  { type: 'say', text: 'Hello, traveler.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'say', text: 'Welcome to the placeholder map.' },
  { type: 'pause', seconds: 1.5 },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'thought', entity: 'pc', text: 'I wonder if a familiar could help here.' },
  { type: 'walk', entity: 'pc', path: [{ direction: 'down', steps: 1 }] },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 2 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  { type: 'stop' },

  { type: 'showStatus', entity: 'pc', stats: { level: 3, role: 'Warrior', hp: 20, maxHp: 20 }, options: ['Close'] },
  { type: 'pause', seconds: 1 },
  { type: 'hideMenu' },
  { type: 'stop' },

  { type: 'levelUp', entity: 'pc', text: 'PC reaches level 3! Radiant unlocked!' },
  { type: 'pause', seconds: 1.5 },
  { type: 'endDialogue' },
  { type: 'stop' },

  { type: 'showOverlay', kind: 'headline', text: 'STAGE 1: VIBE CODING' },
  { type: 'pause', seconds: 1.5 },
  { type: 'hideOverlay' },
  { type: 'addMeter', meterId: 'gold', delta: 10 },
  { type: 'stop' },

  { type: 'walk', entity: 'guide', path: [{ direction: 'left', steps: 2 }] },
  { type: 'pause', seconds: 0.5 },
  { type: 'walkTo', entity: 'pc', target: 'shrine' },
  { type: 'addMeter', meterId: 'gold', delta: 15 },
  { type: 'stop' },

  { type: 'enterScene', scene: 'world-overworld', at: 'town-gate' },
  { type: 'walkTo', entity: 'pc', target: 'cave-entrance' },
  { type: 'stop' },

  // Phase 5 proving script: enter the placeholder cave and run setLightRadius
  // through a grow -> shrink -> extinguish arc, exercising overSeconds and
  // radius: 0 at least once each (design.md's discrete-step animation Decision).
  { type: 'enterScene', scene: 'world-cave', at: 'cave-mouth' },
  { type: 'setLightRadius', anchorEntity: 'pc', radius: 1 },
  { type: 'stop' },

  { type: 'partyJoin', entity: 'familiar', at: 'familiar-spot', fx: 'sparkle' },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 3, overSeconds: 2 },
  { type: 'pause', seconds: 2.2 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 1, overSeconds: 1.5 },
  { type: 'pause', seconds: 1.7 },
  { type: 'stop' },

  { type: 'setLightRadius', anchorEntity: 'pc', radius: 0, overSeconds: 1 },
  { type: 'pause', seconds: 1.2 },
  { type: 'addMeter', meterId: 'gold', delta: 25 },
  { type: 'stop' },

  // Phase 4 proving script: one complete scripted fight, exercising every
  // battle action at least once, including a scripted wrong-action mistake.
  {
    type: 'startBattle',
    allies: [
      { id: 'pc', hp: 20, maxHp: 20 },
      { id: 'familiar', hp: 14, maxHp: 14 },
    ],
    enemies: [{ id: 'slime', hp: 12, maxHp: 12 }],
  },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 0 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  { type: 'battleAction', actor: 'pc', target: 'slime', kind: 'attack', damage: 7, text: 'You attack the slime for 7 damage!' },
  { type: 'pause', seconds: 1.5 },
  { type: 'stop' },

  { type: 'showMenu', menuKind: 'command', options: ['Fight', 'Spell', 'Item', 'Run'] },
  { type: 'pause', seconds: 0.5 },
  { type: 'selectMenuOption', index: 1 },
  { type: 'pause', seconds: 0.5 },
  { type: 'hideMenu' },
  {
    type: 'battleAction',
    actor: 'pc',
    target: 'slime',
    kind: 'wrong-action',
    damage: -5,
    text: 'You cast Fire — but the slime is fire-immune. It heals 5 HP!',
  },
  { type: 'pause', seconds: 1.5 },
  { type: 'stop' },

  { type: 'tagCombatant', entity: 'familiar', action: 'out' },
  { type: 'pause', seconds: 0.5 },
  { type: 'stop' },

  { type: 'battleAction', actor: 'slime', target: 'pc', kind: 'attack', damage: 20, text: 'The slime overwhelms you!' },
  { type: 'pause', seconds: 1 },
  { type: 'endDialogue' },
  { type: 'endBattle', outcome: 'defeat' },
  { type: 'defeatSequence', text: 'THOU ART DEAD' },
  { type: 'pause', seconds: 1 },
  { type: 'stop' },

  // Phase 7 proving script: an achievement toast landing on this stage's
  // failure beat while the defeat overlay is already active, demonstrating
  // `achievement` coexists with `overlay` instead of displacing it. Final
  // copy stays [PARKED] per idea-board.md §8; this is a placeholder line.
  {
    type: 'showAchievement',
    text: 'Thou Wert Slain By Thine Own Cure — you healed an enemy near death, and were then slain by it.',
  },
  { type: 'pause', seconds: 2 },
  { type: 'stop' },

  { type: 'hideAchievement' },
  { type: 'pause', seconds: 1 },
  { type: 'hideOverlay' },
  { type: 'stop' },

  { type: 'enterScene', scene: 'world-town', at: 'town-square' },
  { type: 'stop' },
]
