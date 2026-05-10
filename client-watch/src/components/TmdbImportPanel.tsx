import { useState } from 'react'
import { Badge, Button, TextInput } from '@repo/ui'
import { api, type ExternalResult } from '../api'

interface Props {
  type: 'movie' | 'tv'
  onImported: () => void
}

export function TmdbImportPanel({ type, onImported }: Props) {
  const [mode, setMode] = useState<'title' | 'person'>('title')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExternalResult[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    setChecked(new Set())
    try {
      const data = await api.external.search(type, query.trim(), mode === 'person')
      setResults(data)
    } catch (err: unknown) {
      const e = err as { error?: string }
      setSearchError(e.error ?? 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function toggleCheck(tmdbId: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(tmdbId)) next.delete(tmdbId)
      else next.add(tmdbId)
      return next
    })
  }

  async function handleImport() {
    const selected = results.filter(r => checked.has(r.tmdbId))
    if (!selected.length) return
    setImporting(true)
    try {
      for (const result of selected) {
        await api.external.import(type, result)
      }
      setResults([])
      setChecked(new Set())
      setQuery('')
      onImported()
    } finally {
      setImporting(false)
    }
  }

  const checkedCount = checked.size

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-600 text-xs">
          <button
            type="button"
            onClick={() => { setMode('title'); setResults([]); setChecked(new Set()) }}
            className={`px-3 py-1.5 ${mode === 'title' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Title
          </button>
          <button
            type="button"
            onClick={() => { setMode('person'); setResults([]); setChecked(new Set()) }}
            className={`px-3 py-1.5 ${mode === 'person' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Person
          </button>
        </div>
        <span className="text-xs text-gray-500">Search TMDB</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <TextInput
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'title' ? 'Search by title…' : 'Search by person name…'}
          color="violet"
          className="flex-1"
        />
        <Button type="submit" color="violet" className="py-1.5 text-xs shrink-0" loading={searching}>
          Search
        </Button>
      </form>

      {searchError && <p className="text-xs text-red-400">{searchError}</p>}

      {results.length > 0 && (
        <>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {results.map(r => (
              <label
                key={r.tmdbId}
                className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer select-none ${
                  r.isDuplicate ? 'opacity-50' : 'hover:bg-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked.has(r.tmdbId)}
                  onChange={() => toggleCheck(r.tmdbId)}
                  className="mt-0.5 accent-violet-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {r.title}{r.releaseYear ? ` (${r.releaseYear})` : ''}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {type === 'movie'
                      ? (r.runtimeMinutes ? `${r.runtimeMinutes}m` : '')
                      : (r.seasonCount ? `${r.seasonCount} season${r.seasonCount !== 1 ? 's' : ''}` : '')}
                  </span>
                  {r.isDuplicate && (
                    <Badge color="gray" className="ml-2 text-xs">Already in catalog</Badge>
                  )}
                </div>
              </label>
            ))}
          </div>

          <Button
            color="violet"
            className="w-full py-2 text-sm"
            disabled={checkedCount === 0}
            loading={importing}
            onClick={handleImport}
          >
            Add {checkedCount > 0 ? checkedCount : ''} Selected
          </Button>
        </>
      )}
    </div>
  )
}
