/** ICAO spellings ("Alfa", "Juliett", "X-ray") are canon. Each letter lists real, ordinary English words
 * that start with the same letter and do not sound like the NATO word; a question shows three of them. */
export const NATO: Record<string, { word: string; decoys: string[] }> = {
  A: { word: 'Alfa', decoys: ['Apple', 'Anchor', 'Arrow', 'Autumn', 'Acorn', 'Attic'] },
  B: { word: 'Bravo', decoys: ['Basket', 'Bridge', 'Butter', 'Button', 'Blanket', 'Barrel'] },
  C: { word: 'Charlie', decoys: ['Candle', 'Cactus', 'Camera', 'Carpet', 'Castle', 'Cherry'] },
  D: { word: 'Delta', decoys: ['Dragon', 'Dinner', 'Doctor', 'Donkey', 'Dollar', 'Desert'] },
  E: { word: 'Echo', decoys: ['Eagle', 'Engine', 'Elbow', 'Evening', 'Empire', 'Envelope'] },
  F: { word: 'Foxtrot', decoys: ['Forest', 'Feather', 'Finger', 'Flower', 'Fiddle', 'Funnel'] },
  G: { word: 'Golf', decoys: ['Garden', 'Ginger', 'Guitar', 'Giraffe', 'Glacier', 'Gravel'] },
  H: { word: 'Hotel', decoys: ['Hammer', 'Harbor', 'Helmet', 'Honey', 'Husband', 'Hundred'] },
  I: { word: 'India', decoys: ['Island', 'Insect', 'Iron', 'Ivory', 'Igloo', 'Invoice'] },
  J: { word: 'Juliett', decoys: ['Jacket', 'Jungle', 'Jelly', 'Journey', 'Jigsaw', 'Jaguar'] },
  K: { word: 'Kilo', decoys: ['Kettle', 'Kitchen', 'Kitten', 'Knife', 'Kangaroo', 'Kernel'] },
  L: { word: 'Lima', decoys: ['Ladder', 'Lemon', 'Lantern', 'Library', 'Leather', 'Lizard'] },
  M: { word: 'Mike', decoys: ['Mirror', 'Marble', 'Mountain', 'Muffin', 'Monkey', 'Meadow'] },
  N: { word: 'November', decoys: ['Napkin', 'Needle', 'Noodle', 'Nutmeg', 'Network', 'Nugget'] },
  O: { word: 'Oscar', decoys: ['Orange', 'Otter', 'Ocean', 'Onion', 'Orchard', 'Ostrich'] },
  P: { word: 'Papa', decoys: ['Pencil', 'Pepper', 'Pillow', 'Planet', 'Pocket', 'Pumpkin'] },
  Q: { word: 'Quebec', decoys: ['Queen', 'Quilt', 'Quiver', 'Quartz', 'Quiet', 'Question'] },
  R: { word: 'Romeo', decoys: ['Rabbit', 'Ribbon', 'River', 'Rocket', 'Rainbow', 'Radish'] },
  S: { word: 'Sierra', decoys: ['Saddle', 'Spoon', 'Sunset', 'Salmon', 'Shovel', 'Sandwich'] },
  T: { word: 'Tango', decoys: ['Table', 'Teapot', 'Thunder', 'Ticket', 'Tiger', 'Tunnel'] },
  U: { word: 'Uniform', decoys: ['Umbrella', 'Unicorn', 'Utensil', 'Upstairs', 'Urchin', 'Uncle'] },
  V: { word: 'Victor', decoys: ['Violin', 'Velvet', 'Valley', 'Vinegar', 'Village', 'Voyage'] },
  W: { word: 'Whiskey', decoys: ['Window', 'Wagon', 'Walnut', 'Winter', 'Wallet', 'Whistle'] },
  X: { word: 'X-ray', decoys: ['Xylophone', 'Xenon', 'Xerox', 'Xylem', 'Xebec', 'Xystus'] },
  Y: { word: 'Yankee', decoys: ['Yellow', 'Yogurt', 'Yacht', 'Yarn', 'Yoga', 'Yesterday'] },
  Z: { word: 'Zulu', decoys: ['Zebra', 'Zipper', 'Zigzag', 'Zero', 'Zinc', 'Zodiac'] },
}

export const LETTERS = Object.keys(NATO)
export type Rng = () => number

export interface Stage {
  name: string
  /** The first `pool` letters of the alphabet can appear. */
  pool: number
  /** How long the ID shows before it hides; null keeps it on screen while answering. */
  flashMs: number | null
}

export const IDS_PER_STAGE = 5
/** A stage is cleared with at most this many wrong taps; otherwise it repeats. */
export const MAX_MISTAKES = 2

export const STAGES: Stage[] = [
  { name: 'Warm-up', pool: 8, flashMs: null },
  { name: 'Half way', pool: 13, flashMs: null },
  { name: 'Full alphabet', pool: 26, flashMs: null },
  { name: 'Quick look', pool: 26, flashMs: 3000 },
  { name: 'Blink', pool: 26, flashMs: 1800 },
  { name: 'Flash', pool: 26, flashMs: 1000 },
  { name: 'Lightning', pool: 26, flashMs: 600 },
]

export type Misses = Record<string, number>

export interface State {
  stageIdx: number
  idInStage: number
  id: string
  pos: number
  options: string[]
  /** Words already tapped wrong at this position. */
  wrong: string[]
  phase: 'flash' | 'answer' | 'stageDone' | 'over'
  /** Time the current wait started: flash end, or the previous correct tap. */
  since: number
  roundStart: number
  mistakesStage: number
  tapMs: number[]
  /** Clean-or-not duration of each finished ID in this stage. */
  idMs: number[]
  stageCleared: boolean
  /** Per letter: how often it was tapped wrong. Persisted by the shell; weights letter choice. */
  misses: Misses
  /** Total ms of correct-answer waiting across cleared stages. */
  runMs: number
  over: boolean
}

export function pickLetter(pool: number, misses: Misses, rng: Rng): string {
  const letters = LETTERS.slice(0, pool)
  const weights = letters.map((l) => 1 + 2 * Math.min(misses[l] ?? 0, 5))
  let r = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < letters.length; i++) {
    r -= weights[i]
    if (r < 0) return letters[i]
  }
  return letters[letters.length - 1]
}

export function makeId(pool: number, misses: Misses, rng: Rng): string {
  let id = ''
  for (let i = 0; i < 4; i++) id += pickLetter(pool, misses, rng)
  return id
}

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The correct word plus three of the letter's decoys, shuffled. */
export function makeOptions(letter: string, rng: Rng): string[] {
  const { word, decoys } = NATO[letter]
  return shuffle([word, ...shuffle(decoys, rng).slice(0, 3)], rng)
}

function startRound(s: State, now: number, rng: Rng): State {
  const stage = STAGES[s.stageIdx]
  const id = makeId(stage.pool, s.misses, rng)
  const flash = stage.flashMs !== null
  return {
    ...s,
    id,
    pos: 0,
    options: makeOptions(id[0], rng),
    wrong: [],
    phase: flash ? 'flash' : 'answer',
    since: now,
    roundStart: now,
  }
}

function startStage(s: State, stageIdx: number, now: number, rng: Rng): State {
  return startRound(
    { ...s, stageIdx, idInStage: 0, mistakesStage: 0, tapMs: [], idMs: [], stageCleared: false },
    now,
    rng,
  )
}

export function newGame(rng: Rng, now: number, misses: Misses = {}): State {
  const blank: State = {
    stageIdx: 0, idInStage: 0, id: '', pos: 0, options: [], wrong: [], phase: 'answer', since: now,
    roundStart: now, mistakesStage: 0, tapMs: [], idMs: [], stageCleared: false, misses, runMs: 0, over: false,
  }
  return startStage(blank, 0, now, rng)
}

/** The flash is over: hide the ID and start the clock. */
export function endFlash(s: State, now: number): State {
  if (s.phase !== 'flash') return s
  return { ...s, phase: 'answer', since: now, roundStart: now }
}

/** Tap an option. Returns the same object when the tap is not allowed. */
export function answer(s: State, word: string, now: number, rng: Rng): State {
  if (s.phase !== 'answer' || !s.options.includes(word) || s.wrong.includes(word)) return s
  const letter = s.id[s.pos]
  if (word !== NATO[letter].word) {
    return {
      ...s,
      wrong: [...s.wrong, word],
      mistakesStage: s.mistakesStage + 1,
      misses: { ...s.misses, [letter]: (s.misses[letter] ?? 0) + 1 },
    }
  }
  const tapMs = [...s.tapMs, now - s.since]
  if (s.pos < 3) {
    return { ...s, tapMs, pos: s.pos + 1, options: makeOptions(s.id[s.pos + 1], rng), wrong: [], since: now }
  }
  const idMs = [...s.idMs, now - s.roundStart]
  const idInStage = s.idInStage + 1
  const done = { ...s, tapMs, idMs, idInStage, since: now }
  if (idInStage < IDS_PER_STAGE) return startRound(done, now, rng)
  const stageCleared = s.mistakesStage <= MAX_MISTAKES
  const runMs = s.runMs + (stageCleared ? idMs.reduce((a, b) => a + b, 0) : 0)
  return { ...done, phase: 'stageDone', stageCleared, runMs }
}

/** Leave the stage summary: next stage if cleared, else repeat; past the last stage the run is over. */
export function nextStage(s: State, now: number, rng: Rng): State {
  if (s.phase !== 'stageDone') return s
  const next = s.stageCleared ? s.stageIdx + 1 : s.stageIdx
  if (next >= STAGES.length) return { ...s, phase: 'over', over: true }
  return startStage(s, next, now, rng)
}

export type Move =
  | { type: 'answer'; word: string }
  | { type: 'endFlash' }
  | { type: 'next' }

export function legalMoves(s: State): Move[] {
  if (s.phase === 'flash') return [{ type: 'endFlash' }]
  if (s.phase === 'stageDone') return [{ type: 'next' }]
  if (s.phase === 'answer') return s.options.filter((w) => !s.wrong.includes(w)).map((word) => ({ type: 'answer', word }))
  return []
}

export function apply(s: State, m: Move, now: number, rng: Rng): State {
  if (m.type === 'endFlash') return endFlash(s, now)
  if (m.type === 'next') return nextStage(s, now, rng)
  return answer(s, m.word, now, rng)
}

export function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
