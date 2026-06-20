import { useCallback, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { useAuth } from '@repo/auth'
import PhaserGame from '../PhaserGame'
import BallMergeScene, { GAME_W, GAME_H } from './BallMergeScene'
import Leaderboard from '../../components/Leaderboard'
import { submitScore, fetchLeaderboard, type LeaderboardEntry } from '../../api'

const GAME_SLUG = 'ball-merge'
const MODE = 'classic'
const LEVEL = 'box'

export default function BallMergeGame() {
  const { displayName, userId } = useAuth()
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [didQuit, setDidQuit] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState(false)
  const gameRef = useRef<Phaser.Game | null>(null)
  const scoreRef = useRef(0)

  const playerName = displayName ?? (userId !== null ? String(userId) : null)

  const openLeaderboard = useCallback(async () => {
    setLeaderboardOpen(true)
    setLeaderboardLoading(true)
    setLeaderboardError(false)
    try {
      const entries = await fetchLeaderboard(GAME_SLUG, MODE, LEVEL)
      setLeaderboardEntries(entries)
    } catch {
      setLeaderboardError(true)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

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
    game.events.on('score', (value: number) => {
      setScore(value)
      scoreRef.current = value
    })
    game.events.on('gameover', (finalScore: number) => {
      setGameOver(true)
      submitScore(GAME_SLUG, MODE, LEVEL, finalScore)
      openLeaderboard()
    })
  }, [openLeaderboard])

  const quit = useCallback(() => {
    gameRef.current?.scene.pause('BallMergeScene')
    setGameOver(true)
    setDidQuit(true)
    submitScore(GAME_SLUG, MODE, LEVEL, scoreRef.current)
    openLeaderboard()
  }, [openLeaderboard])

  const restart = useCallback(() => {
    setGameOver(false)
    setDidQuit(false)
    setScore(0)
    setLeaderboardOpen(false)
    setLeaderboardEntries([])
    gameRef.current?.scene.resume('BallMergeScene')
    gameRef.current?.events.emit('restart')
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Score HUD */}
      <div
        className="absolute top-2 left-0 right-0 z-10 flex justify-between items-start px-4 pointer-events-none"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <div className="bg-gray-800/80 rounded-lg px-3 py-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Score</div>
          <div className="text-xl font-bold tabular-nums">{score}</div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          {!gameOver && (
            <button
              onClick={quit}
              className="bg-gray-800/80 rounded-lg p-2 text-gray-400 hover:text-red-400 active:text-red-500"
              aria-label="Quit game"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </button>
          )}
          <button
            onClick={openLeaderboard}
            className="bg-gray-800/80 rounded-lg p-2 text-yellow-400 hover:text-yellow-300 active:text-yellow-500"
            aria-label="View leaderboard"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      </div>

      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

      {/* Mid-game leaderboard panel */}
      {leaderboardOpen && !gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <Leaderboard
            entries={leaderboardEntries}
            loading={leaderboardLoading}
            error={leaderboardError}
            currentPlayerName={playerName}
            onClose={() => setLeaderboardOpen(false)}
          />
        </div>
      )}

      {/* Game-over overlay */}
      {gameOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-gray-900/80 backdrop-blur-sm px-4">
          <h2 className="text-3xl font-bold">{didQuit ? 'You Quit' : 'Game Over'}</h2>
          <p className="text-gray-300">
            Score: <span className="font-bold text-white">{score.toLocaleString()}</span>
          </p>
          <Leaderboard
            entries={leaderboardEntries}
            loading={leaderboardLoading}
            error={leaderboardError}
            currentPlayerName={playerName}
          />
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
