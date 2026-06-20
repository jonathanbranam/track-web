import { useCallback, useEffect, useRef, useState } from 'react'

interface Accel {
  x: number | null
  y: number | null
  z: number | null
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-yellow-300">{value}</span>
    </div>
  )
}

function EventButton({
  label,
  handlers,
}: {
  label: string
  handlers: Record<string, (e: React.SyntheticEvent) => void>
}) {
  return (
    <button
      {...handlers}
      className="bg-gray-700 active:bg-gray-600 rounded px-3 py-2 text-xs text-center touch-manipulation"
    >
      {label}
    </button>
  )
}

export default function TiltTester() {
  const [log, setLog] = useState<string[]>([])
  const [accel, setAccel] = useState<Accel | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const append = useCallback((msg: string) => {
    setLog((prev) => [...prev, `[${timestamp()}] ${msg}`])
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  function makeHandlers(eventType: string) {
    const handler = (e: React.SyntheticEvent) => {
      e.stopPropagation()
      append(`${eventType} fired`)
    }
    return { [eventType]: handler }
  }

  async function requestPermission() {
    const DME = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<PermissionState>
    }
    if (typeof DME?.requestPermission !== 'function') {
      append('permission: not available')
      return
    }
    try {
      const result = await DME.requestPermission()
      append(`permission: ${result}`)
      if (result === 'granted') {
        window.addEventListener('devicemotion', handleMotion)
      }
    } catch (err) {
      append(`permission error: ${String(err)}`)
    }
  }

  function handleMotion(e: DeviceMotionEvent) {
    const g = e.accelerationIncludingGravity
    setAccel({ x: g?.x ?? null, y: g?.y ?? null, z: g?.z ?? null })
  }

  function reload() {
    setLog([])
    setAccel(null)
  }

  const dmType = typeof (window as { DeviceMotionEvent?: unknown }).DeviceMotionEvent
  const hasRequestPermission =
    dmType !== 'undefined'
      ? typeof (
          window.DeviceMotionEvent as typeof DeviceMotionEvent & {
            requestPermission?: unknown
          }
        )?.requestPermission
      : 'undefined'

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {/* Environment readout */}
      <div className="bg-gray-800 rounded-lg p-3 space-y-1 shrink-0">
        <p className="text-xs font-semibold text-gray-300 mb-2">Environment</p>
        <EnvRow label="isSecureContext" value={String(window.isSecureContext)} />
        <EnvRow label="DeviceMotionEvent in window" value={String('DeviceMotionEvent' in window)} />
        <EnvRow label="typeof requestPermission" value={hasRequestPermission} />
      </div>

      {/* Live sensor readout */}
      {accel && (
        <div className="bg-gray-800 rounded-lg p-3 shrink-0">
          <p className="text-xs font-semibold text-gray-300 mb-2">accelerationIncludingGravity</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm font-mono">
            <div><span className="text-gray-400">x </span><span className="text-green-300">{accel.x?.toFixed(2) ?? '—'}</span></div>
            <div><span className="text-gray-400">y </span><span className="text-green-300">{accel.y?.toFixed(2) ?? '—'}</span></div>
            <div><span className="text-gray-400">z </span><span className="text-green-300">{accel.z?.toFixed(2) ?? '—'}</span></div>
          </div>
        </div>
      )}

      {/* Button grid */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-gray-300 mb-2">Event types</p>
        <div className="grid grid-cols-3 gap-2">
          <EventButton label="onClick" handlers={makeHandlers('onClick')} />
          <EventButton label="onPointerDown" handlers={makeHandlers('onPointerDown')} />
          <EventButton label="onPointerUp" handlers={makeHandlers('onPointerUp')} />
          <EventButton label="onTouchStart" handlers={makeHandlers('onTouchStart')} />
          <EventButton label="onTouchEnd" handlers={makeHandlers('onTouchEnd')} />
        </div>
        <p className="text-xs font-semibold text-gray-300 mt-3 mb-2">
          Inside <code className="text-yellow-300">pointer-events: none</code> parent
        </p>
        <div className="grid grid-cols-2 gap-2" style={{ pointerEvents: 'none' }}>
          <button
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => { e.stopPropagation(); append('onClick fired (PE:none parent)') }}
            className="bg-gray-700 active:bg-gray-600 rounded px-3 py-2 text-xs text-center touch-manipulation"
          >
            onClick (PE:none parent)
          </button>
          <button
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e) => { e.stopPropagation(); append('onPointerDown fired (PE:none parent)') }}
            className="bg-gray-700 active:bg-gray-600 rounded px-3 py-2 text-xs text-center touch-manipulation"
          >
            onPointerDown (PE:none parent)
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={requestPermission}
          className="flex-1 bg-indigo-600 active:bg-indigo-500 rounded px-3 py-2 text-sm font-medium touch-manipulation"
        >
          Request Permission
        </button>
        <button
          onClick={reload}
          className="bg-gray-700 active:bg-gray-600 rounded px-3 py-2 text-sm touch-manipulation"
        >
          Reload
        </button>
      </div>

      {/* Event log */}
      <div
        ref={logRef}
        className="flex-1 bg-gray-950 rounded-lg p-3 overflow-y-auto font-mono text-xs text-gray-300 min-h-0"
      >
        {log.length === 0 ? (
          <p className="text-gray-600 italic">— tap a button to log events —</p>
        ) : (
          log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  )
}
