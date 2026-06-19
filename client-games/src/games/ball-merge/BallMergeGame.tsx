import { useCallback, useRef, useState } from 'react'
import Phaser from 'phaser'
import PhaserGame from '../PhaserGame'
import BallMergeScene, { GAME_W, GAME_H } from './BallMergeScene'

const BEST_KEY = 'ball-merge:best'

function loadBest(): number {
  const raw = localStorage.getItem(BEST_KEY)
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export default function BallMergeGame() {
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [gameOver, setGameOver] = useState(false)
  const gameRef = useRef<Phaser.Game | null>(null)

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#111827',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.9 },
          debug: false,
        },
      },
      scene: BallMergeScene,
    }),
    [],
  )

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    game.events.on('score', (value: number) => setScore(value))
    game.events.on('gameover', (finalScore: number) => {
      setGameOver(true)
      setBest((prev) => {
        if (finalScore > prev) {
          localStorage.setItem(BEST_KEY, String(finalScore))
          return finalScore
        }
        return prev
      })
    })
  }, [])

  const restart = useCallback(() => {
    setGameOver(false)
    setScore(0)
    gameRef.current?.events.emit('restart')
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Score HUD */}
      <div className="absolute top-2 left-0 right-0 z-10 flex justify-between px-4 pointer-events-none"
           style={{ paddingTop: 'var(--sat)' }}>
        <div className="bg-gray-800/80 rounded-lg px-3 py-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Score</div>
          <div className="text-xl font-bold tabular-nums">{score}</div>
        </div>
        <div className="bg-gray-800/80 rounded-lg px-3 py-1 text-right">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Best</div>
          <div className="text-xl font-bold tabular-nums">{best}</div>
        </div>
      </div>

      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

      {gameOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-2">Game Over</h2>
          <p className="text-gray-300 mb-1">Score: <span className="font-bold text-white">{score}</span></p>
          <p className="text-gray-400 mb-6">Best: <span className="font-semibold text-gray-200">{best}</span></p>
          <button
            onClick={restart}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl px-8 py-3 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
