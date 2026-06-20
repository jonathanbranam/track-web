import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useVersionGesture } from './useVersionGesture'

interface VersionInfo {
  sha: string
  commitTime: string | null
  buildTime: string | null
}

interface VersionOverlayProps {
  clientSha: string
  buildTime: string
  logoRef?: React.RefObject<HTMLElement | null>
}

function formatEastern(isoUtc: string | null): string {
  if (!isoUtc) return '—'
  try {
    return new Date(isoUtc).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return isoUtc
  }
}

export function VersionOverlay({ clientSha, buildTime, logoRef }: VersionOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [serverInfo, setServerInfo] = useState<VersionInfo | null>(null)
  const [serverOffline, setServerOffline] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const internalLogoRef = useRef<HTMLElement | null>(null)
  const effectiveLogoRef = logoRef ?? internalLogoRef

  const reveal = useCallback(() => {
    setVisible(true)
    setServerInfo(null)
    setServerOffline(false)

    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => setServerInfo(data as VersionInfo))
      .catch(() => setServerOffline(true))

    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => setVisible(false), 4000)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
  }, [])

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  useVersionGesture(effectiveLogoRef, reveal)

  const serverSha = serverOffline ? 'offline' : (serverInfo?.sha ?? '…')
  const matched = !serverOffline && serverInfo && clientSha !== 'dev' && clientSha === serverInfo.sha

  return (
    <>
      <div
        ref={internalLogoRef as React.RefObject<HTMLDivElement>}
        className="fixed top-0 left-0 w-11 z-[9998]"
        style={{ height: 'var(--sat, 44px)' }}
        aria-hidden="true"
      />
      {visible && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
          onClick={dismiss}
        >
          <div className="bg-gray-900/95 border border-gray-700 rounded-2xl px-6 py-5 text-sm text-white shadow-2xl min-w-[260px] max-w-[90vw]">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Version</div>
            <div className="space-y-2">
              <Row label="Client SHA" value={clientSha} mono />
              <Row label="Build time" value={formatEastern(buildTime)} />
              <Row
                label="Server SHA"
                value={serverSha}
                mono
                dim={serverOffline || serverInfo === null}
              />
              {serverInfo && (
                <Row label="Commit time" value={formatEastern(serverInfo.commitTime)} />
              )}
            </div>
            {serverInfo && (
              <div className={`mt-3 text-xs font-semibold ${matched ? 'text-green-400' : 'text-yellow-400'}`}>
                {matched ? 'Client matches server' : 'Client may be stale'}
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">Tap to dismiss</div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({
  label,
  value,
  mono = false,
  dim = false,
}: {
  label: string
  value: string
  mono?: boolean
  dim?: boolean
}) {
  return (
    <div className="flex justify-between gap-4 items-baseline">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${dim ? 'text-gray-500' : 'text-white'} text-right truncate`}>
        {value}
      </span>
    </div>
  )
}
