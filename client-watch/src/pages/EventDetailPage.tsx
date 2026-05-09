import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import { Badge, Button, InviteePicker, LoadingSpinner } from '@repo/ui'
import { api, type WatchEventDetail, type WatchEventCandidate, type Movie, type TvSeries } from '../api'

const VOTE_LABELS: Record<number, string> = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' }

type SearchResult =
  | { kind: 'movie'; id: number; title: string }
  | { kind: 'tv'; id: number; title: string }

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
          className={`flex-1 min-h-[40px] text-xs rounded-lg transition-colors ${
            currentVote === v
              ? 'bg-violet-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {VOTE_LABELS[v]}
        </button>
      ))}
    </div>
  )
}

type Invitee = { type: 'user'; userId: number } | { type: 'group'; groupId: number }

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<WatchEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Nominate UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [pickedCandidate, setPickedCandidate] = useState<{ movieId?: number; seriesId?: number; itemType: 'movie' | 'tv'; title: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection UI state
  const [selectionCandidateId, setSelectionCandidateId] = useState('')
  const [episodeMode, setEpisodeMode] = useState<'latest' | 'specific'>('latest')

  // Remove candidate confirmation state
  const [confirmingRemove, setConfirmingRemove] = useState<number | null>(null)

  // Invite management UI state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState<Invitee[]>([])
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

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

  // Debounced parallel search for movies and TV series
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const [movies, tvSeries] = await Promise.all([
        api.movies.list({ q: searchQuery }).catch(() => [] as Movie[]),
        api.tv.list({ q: searchQuery }).catch(() => [] as TvSeries[]),
      ])
      const nominatedMovieIds = new Set(detail?.candidates.map(c => c.movieId).filter((id): id is number => id !== null))
      const nominatedSeriesIds = new Set(detail?.candidates.map(c => c.seriesId).filter((id): id is number => id !== null))
      const results: SearchResult[] = [
        ...movies.map(m => ({ kind: 'movie' as const, id: m.id, title: m.title })),
        ...tvSeries.map(s => ({ kind: 'tv' as const, id: s.id, title: s.title })),
      ].filter(r => r.kind === 'movie' ? !nominatedMovieIds.has(r.id) : !nominatedSeriesIds.has(r.id))
      setSearchResults(results)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  async function handleRsvp(attendance: 'yes' | 'no' | 'maybe') {
    await api.events.rsvp(eventId, attendance)
    load()
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedCandidate) return
    try {
      await api.events.addCandidate(eventId, {
        movieId: pickedCandidate.movieId,
        seriesId: pickedCandidate.seriesId,
      })
      setPickedCandidate(null)
      setSearchQuery('')
      setSearchResults([])
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
    const candidate = detail?.candidates.find(c => c.id === candidateId)
    await api.events.setSelection(eventId, {
      candidateId,
      episodeMode: candidate?.itemType === 'tv' ? episodeMode : null,
    })
    load()
  }

  async function handleComplete() {
    try {
      await api.events.complete(eventId)
      load()
    } catch {}
  }

  async function handleAddInvitees(e: React.FormEvent) {
    e.preventDefault()
    if (selectedInvitees.length === 0) return
    setInviteSubmitting(true)
    try {
      await api.events.addInvitees(eventId, selectedInvitees)
      setSelectedInvitees([])
      setInviteOpen(false)
      load()
    } catch {
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleRemoveCandidate(candidateId: number) {
    await api.events.removeCandidate(eventId, candidateId)
    setConfirmingRemove(null)
    load()
  }

  async function handleRemoveInvitee(inviteeId: number) {
    await api.events.removeInvitee(eventId, inviteeId)
    if (inviteeId === userId) {
      navigate('/events')
    } else {
      load()
    }
  }

  if (loading) return <LoadingSpinner className="h-64" />
  if (error || !detail) return <div className="px-4 py-6 text-red-400">{error ?? 'Not found'}</div>

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

  const selectedCandidateItemType = selectionCandidateId
    ? sortedCandidates.find(c => c.id === parseInt(selectionCandidateId, 10))?.itemType
    : undefined

  return (
    <div className="px-4 py-6 space-y-4 pb-8">
      {/* Header card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {event.completedAt && <span className="text-xs text-green-400">Completed</span>}
          </div>
        </div>
        <p className="text-sm text-gray-400">{new Date(event.scheduledDate).toLocaleDateString()}</p>
      </div>

      {/* Attendance card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Attendees</h2>
        <ul className="space-y-2">
          {invites.map(inv => (
            <li key={inv.userId} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{inv.displayName}</span>
              <div className="flex gap-1 shrink-0">
                {(['yes', 'no', 'maybe'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => inv.userId === userId ? handleRsvp(a) : undefined}
                    disabled={inv.userId !== userId}
                    className={`text-xs px-2 py-1 rounded-lg capitalize transition-colors ${
                      inv.attendance === a
                        ? a === 'yes' ? 'bg-green-700 text-white' : a === 'no' ? 'bg-red-700 text-white' : 'bg-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-400 disabled:opacity-50'
                    } ${inv.userId === userId ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    {a}
                  </button>
                ))}
                {(isHost || !!myInvite) && inv.userId !== event.createdByUserId && !event.completedAt && (
                  <button
                    onClick={() => handleRemoveInvitee(inv.userId)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-800 hover:text-white transition-colors"
                    aria-label={`Remove ${inv.displayName}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Invite More section */}
        {(isHost || !!myInvite) && !event.completedAt && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setInviteOpen(o => !o)}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              {inviteOpen ? 'Cancel' : '+ Invite More'}
            </button>
            {inviteOpen && (
              <form onSubmit={handleAddInvitees} className="mt-3 space-y-3">
                <InviteePicker
                  selected={selectedInvitees}
                  onChange={setSelectedInvitees}
                  excludeUserIds={invites.map(i => i.userId)}
                />
                <Button
                  type="submit"
                  color="violet"
                  className="w-full"
                  loading={inviteSubmitting}
                  disabled={selectedInvitees.length === 0}
                >
                  Add Invitees
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Candidates card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Candidates</h2>

        {sortedCandidates.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No candidates yet.</p>
        )}

        <ul className="space-y-3 mb-4">
          {sortedCandidates.map(c => (
            <li key={c.id} className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">{c.movieTitle ?? c.seriesTitle}</p>
                  <Badge color={c.itemType === 'movie' ? 'violet' : 'indigo'} className="text-xs mt-0.5">
                    {c.itemType === 'movie' ? 'Movie' : 'TV'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-violet-400">
                    {getScore(c) > 0 ? '+' : ''}{getScore(c)}
                  </span>
                  {myInvite && !event.completedAt && (
                    confirmingRemove === c.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemoveCandidate(c.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingRemove(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingRemove(c.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-800 hover:text-white transition-colors"
                        aria-label={`Remove ${c.movieTitle ?? c.seriesTitle}`}
                      >
                        ✕
                      </button>
                    )
                  )}
                </div>
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

        {myInvite && !event.completedAt && (
          <form onSubmit={handleAddCandidate} className="space-y-2">
            {pickedCandidate ? (
              <div className="flex items-center gap-2 bg-gray-700/50 rounded-xl px-3 py-2.5">
                <Badge color={pickedCandidate.itemType === 'movie' ? 'violet' : 'indigo'} className="text-xs shrink-0">
                  {pickedCandidate.itemType === 'movie' ? 'Movie' : 'TV'}
                </Badge>
                <span className="text-sm flex-1 truncate">{pickedCandidate.title}</span>
                <button
                  type="button"
                  onClick={() => setPickedCandidate(null)}
                  className="text-gray-400 hover:text-white text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search movies or TV shows…"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {searchResults.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(r => (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setPickedCandidate({
                              movieId: r.kind === 'movie' ? r.id : undefined,
                              seriesId: r.kind === 'tv' ? r.id : undefined,
                              itemType: r.kind,
                              title: r.title,
                            })
                            setSearchQuery('')
                            setSearchResults([])
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${r.kind === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-blue-900 text-blue-300'}`}>
                            {r.kind === 'movie' ? 'Movie' : 'TV'}
                          </span>
                          <span className="truncate">{r.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Button type="submit" color="violet" className="w-full" disabled={!pickedCandidate}>
              Nominate
            </Button>
          </form>
        )}
      </div>

      {/* Selection (host) */}
      {isHost && !event.completedAt && (
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Confirm Selection</h2>
          {selection ? (
            <div className="bg-gray-700/50 rounded-xl p-3 mb-3">
              <p className="text-sm">Candidate #{selection.candidateId} selected</p>
              {selection.episodeMode && (
                <p className="text-xs text-gray-400">Mode: {selection.episodeMode}</p>
              )}
            </div>
          ) : null}
          <form onSubmit={handleSetSelection} className="space-y-3">
            <select
              value={selectionCandidateId}
              onChange={e => setSelectionCandidateId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select winner…</option>
              {sortedCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.movieTitle ?? c.seriesTitle} [{c.itemType === 'movie' ? 'Movie' : 'TV'}] (score: {getScore(c)})
                </option>
              ))}
            </select>
            {selectedCandidateItemType === 'tv' && (
              <div className="flex gap-2">
                {(['latest', 'specific'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEpisodeMode(m)}
                    className={`flex-1 min-h-[40px] text-sm rounded-xl capitalize transition-colors ${
                      episodeMode === m ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <Button type="submit" color="violet" className="w-full" disabled={!selectionCandidateId}>
              Set Selection
            </Button>
          </form>
        </div>
      )}

      {/* Complete button */}
      {isHost && selection && !event.completedAt && (
        <Button variant="danger" className="w-full" onClick={handleComplete}>
          Mark Event Complete
        </Button>
      )}
    </div>
  )
}
