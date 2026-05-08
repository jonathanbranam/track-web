import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import { api, type WatchEventDetail, type WatchEventCandidate } from '../api'

const VOTE_LABELS: Record<number, string> = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' }

function VoteButtons({ candidateId, eventId, currentVote, onVote }: {
  candidateId: number
  eventId: number
  currentVote: number | undefined
  onVote: (vote: number) => void
}) {
  const values = [-2, -1, 0, 1, 2]
  return (
    <div className="flex gap-1">
      {values.map(v => (
        <button
          key={v}
          onClick={() => onVote(v)}
          className={`w-8 h-7 text-xs rounded transition-colors ${
            currentVote === v
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {VOTE_LABELS[v]}
        </button>
      ))}
    </div>
  )
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { userId } = useAuth()
  const [detail, setDetail] = useState<WatchEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addMovieId, setAddMovieId] = useState('')
  const [addSeriesId, setAddSeriesId] = useState('')
  const [selectionCandidateId, setSelectionCandidateId] = useState('')
  const [episodeMode, setEpisodeMode] = useState<'latest' | 'specific'>('latest')

  const eventId = parseInt(id ?? '0', 10)

  async function load() {
    try {
      const d = await api.events.get(eventId)
      setDetail(d)
    } catch {
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId])

  async function handleRsvp(attendance: 'yes' | 'no' | 'maybe') {
    await api.events.rsvp(eventId, attendance)
    load()
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    const movieId = addMovieId ? parseInt(addMovieId, 10) : undefined
    const seriesId = addSeriesId ? parseInt(addSeriesId, 10) : undefined
    if (!movieId && !seriesId) return
    try {
      await api.events.addCandidate(eventId, { movieId, seriesId })
      setAddMovieId('')
      setAddSeriesId('')
      load()
    } catch {}
  }

  async function handleVote(candidateId: number, vote: number) {
    await api.events.vote(eventId, candidateId, vote)
    load()
  }

  async function handleSetSelection(e: React.FormEvent) {
    e.preventDefault()
    const candidateId = parseInt(selectionCandidateId, 10)
    if (!candidateId) return
    await api.events.setSelection(eventId, { candidateId, episodeMode: detail?.event.type === 'tv' ? episodeMode : null })
    load()
  }

  async function handleComplete() {
    try {
      await api.events.complete(eventId)
      load()
    } catch {}
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>
  if (error || !detail) return <div className="p-6 text-red-400">{error ?? 'Not found'}</div>

  const { event, invites, candidates, selection } = detail
  const isHost = event.createdByUserId === userId
  const myInvite = invites.find(i => i.userId === userId)

  function getScore(c: WatchEventCandidate): number {
    return c.votes.reduce((sum, v) => sum + v.vote, 0)
  }

  function myVoteFor(c: WatchEventCandidate): number | undefined {
    return c.votes.find(v => v.userId === userId)?.vote
  }

  const sortedCandidates = [...candidates].sort((a, b) => getScore(b) - getScore(a))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded capitalize">{event.type}</span>
            {event.completedAt && <span className="text-xs text-green-400">Completed</span>}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">{new Date(event.scheduledDate).toLocaleDateString()}</p>
      </div>

      {/* Attendance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Attendees</h2>
        <ul className="space-y-1">
          {invites.map(inv => (
            <li key={inv.userId} className="flex items-center justify-between">
              <span className="text-sm">{inv.displayName}</span>
              <div className="flex gap-1">
                {(['yes', 'no', 'maybe'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => inv.userId === userId ? handleRsvp(a) : undefined}
                    disabled={inv.userId !== userId}
                    className={`text-xs px-2 py-0.5 rounded capitalize transition-colors ${
                      inv.attendance === a
                        ? a === 'yes' ? 'bg-green-700 text-white' : a === 'no' ? 'bg-red-700 text-white' : 'bg-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-400 disabled:opacity-50'
                    } ${inv.userId === userId ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Candidates */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Candidates</h2>

        {sortedCandidates.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No candidates yet.</p>
        )}

        <ul className="space-y-2 mb-3">
          {sortedCandidates.map(c => (
            <li key={c.id} className="bg-gray-800 rounded p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">{c.movieTitle ?? c.seriesTitle}</p>
                  <p className="text-xs text-gray-500 capitalize">{c.itemType}</p>
                </div>
                <span className="text-sm font-semibold text-blue-400">
                  Score: {getScore(c) > 0 ? '+' : ''}{getScore(c)}
                </span>
              </div>
              {myInvite && !event.completedAt && (
                <VoteButtons
                  candidateId={c.id}
                  eventId={eventId}
                  currentVote={myVoteFor(c)}
                  onVote={v => handleVote(c.id, v)}
                />
              )}
              {selection?.candidateId === c.id && (
                <p className="text-xs text-green-400 mt-1">✓ Selected</p>
              )}
            </li>
          ))}
        </ul>

        {/* Add candidate form */}
        {myInvite && !event.completedAt && (
          <form onSubmit={handleAddCandidate} className="flex gap-2">
            <input
              type="number"
              value={event.type === 'movie' ? addMovieId : addSeriesId}
              onChange={e => event.type === 'movie' ? setAddMovieId(e.target.value) : setAddSeriesId(e.target.value)}
              placeholder={event.type === 'movie' ? 'Movie ID' : 'Series ID'}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded"
            >
              Nominate
            </button>
          </form>
        )}
      </div>

      {/* Selection (host) */}
      {isHost && !event.completedAt && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Confirm Selection</h2>
          {selection ? (
            <div className="bg-gray-800 rounded p-3 mb-2">
              <p className="text-sm">Candidate #{selection.candidateId} selected</p>
              {selection.episodeMode && (
                <p className="text-xs text-gray-400">Mode: {selection.episodeMode}</p>
              )}
            </div>
          ) : null}
          <form onSubmit={handleSetSelection} className="space-y-2">
            <select
              value={selectionCandidateId}
              onChange={e => setSelectionCandidateId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select winner…</option>
              {sortedCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.movieTitle ?? c.seriesTitle} (score: {getScore(c)})
                </option>
              ))}
            </select>
            {event.type === 'tv' && (
              <div className="flex gap-2">
                {(['latest', 'specific'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEpisodeMode(m)}
                    className={`flex-1 py-1.5 text-xs rounded capitalize transition-colors ${
                      episodeMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <button
              type="submit"
              disabled={!selectionCandidateId}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded disabled:opacity-50"
            >
              Set Selection
            </button>
          </form>
        </div>
      )}

      {/* Complete button */}
      {isHost && selection && !event.completedAt && (
        <button
          onClick={handleComplete}
          className="w-full bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2 rounded"
        >
          Mark Event Complete
        </button>
      )}
    </div>
  )
}
