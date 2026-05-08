import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export function NewEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'movie' | 'tv'>('movie')
  const [scheduledDate, setScheduledDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledDate) return

    setSubmitting(true)
    setError(null)
    try {
      const event = await api.events.create({
        title: title.trim(),
        type,
        scheduledDate,
        invitees: [],
      })
      navigate(`/events/${event.id}`)
    } catch {
      setError('Failed to create event')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">New Watch Event</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Movie night…"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <div className="flex gap-2">
            {(['movie', 'tv'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${
                  type === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {t === 'tv' ? 'TV' : 'Movie'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="flex-1 py-2 rounded text-sm text-gray-400 bg-gray-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !scheduledDate}
            className="flex-1 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
