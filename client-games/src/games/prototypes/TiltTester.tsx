import { useCallback, useEffect, useRef, useState } from 'react'

interface Accel {
  x: number | null
  y: number | null
  z: number | null
}

function ts(): string {
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

function FakeCanvas() {
  return (
    <div
      className="absolute inset-0 bg-blue-950 flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <span className="text-blue-800 text-xs select-none">fake canvas</span>
    </div>
  )
}

export default function TiltTester() {
  const [log, setLog] = useState<string[]>([])
  const [accel, setAccel] = useState<Accel | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const append = useCallback((msg: string) => {
    setLog((prev) => [...prev, `[${ts()}] ${msg}`])
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

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
      if (result === 'granted') window.addEventListener('devicemotion', handleMotion)
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
      ? typeof (window.DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: unknown })?.requestPermission
      : 'undefined'

  const btn = 'bg-gray-800/90 text-white text-xs px-3 py-1.5 rounded touch-manipulation active:bg-gray-700'

  async function tryPermission(label: string) {
    append(`${label}: tapped`)
    const DME = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<PermissionState>
    }
    if (typeof DME?.requestPermission !== 'function') {
      append(`${label}: requestPermission not available`)
      return
    }
    try {
      const result = await DME.requestPermission()
      append(`${label}: permission → ${result}`)
      if (result === 'granted') window.addEventListener('devicemotion', handleMotion)
    } catch (err) {
      append(`${label}: error — ${String(err)}`)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">

      {/* ── HUD Pattern Tests ── */}
      <div className="shrink-0 space-y-3">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">HUD Pattern Tests (over fake canvas)</p>
        <p className="text-xs text-gray-500">Each button calls requestPermission(). Watch for the iOS dialog AND the log.</p>

        {/* Pattern A: current Ball Merge structure */}
        <div className="bg-gray-800 rounded-lg p-2 space-y-1">
          <p className="text-xs text-yellow-400">A — Current Ball Merge: outer PE:none → inner PE:auto → onPointerDown</p>
          <div className="relative h-12 rounded overflow-hidden">
            <FakeCanvas />
            <div className="absolute inset-0 z-10 flex items-center justify-end px-2 pointer-events-none">
              <div className="pointer-events-auto">
                <button
                  onPointerDown={() => tryPermission('A')}
                  className={btn}
                >
                  Tap A
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pattern B: Option D — no PE:none ancestor on buttons */}
        <div className="bg-gray-800 rounded-lg p-2 space-y-1">
          <p className="text-xs text-green-400">B — Option D: score has PE:none, buttons have no PE:none ancestor</p>
          <div className="relative h-12 rounded overflow-hidden">
            <FakeCanvas />
            <div className="absolute inset-0 z-10 flex items-center justify-between px-2">
              <div className="pointer-events-none text-xs text-gray-500">score</div>
              <button
                onPointerDown={() => tryPermission('B')}
                className={btn}
              >
                Tap B
              </button>
            </div>
          </div>
        </div>

        {/* Pattern C: same as A but onTouchStart */}
        <div className="bg-gray-800 rounded-lg p-2 space-y-1">
          <p className="text-xs text-blue-400">C — Like A but onTouchStart instead of onPointerDown</p>
          <div className="relative h-12 rounded overflow-hidden">
            <FakeCanvas />
            <div className="absolute inset-0 z-10 flex items-center justify-end px-2 pointer-events-none">
              <div className="pointer-events-auto">
                <button
                  onTouchStart={() => tryPermission('C')}
                  className={btn}
                >
                  Tap C
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pattern D: same as A but onClick */}
        <div className="bg-gray-800 rounded-lg p-2 space-y-1">
          <p className="text-xs text-purple-400">D — Like A but onClick instead of onPointerDown</p>
          <div className="relative h-12 rounded overflow-hidden">
            <FakeCanvas />
            <div className="absolute inset-0 z-10 flex items-center justify-end px-2 pointer-events-none">
              <div className="pointer-events-auto">
                <button
                  onClick={() => tryPermission('D')}
                  className={btn}
                >
                  Tap D
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Environment ── */}
      <div className="bg-gray-800 rounded-lg p-3 space-y-1 shrink-0">
        <p className="text-xs font-semibold text-gray-300 mb-2">Environment</p>
        <EnvRow label="isSecureContext" value={String(window.isSecureContext)} />
        <EnvRow label="DeviceMotionEvent in window" value={String('DeviceMotionEvent' in window)} />
        <EnvRow label="typeof requestPermission" value={hasRequestPermission} />
      </div>

      {/* ── Live sensor ── */}
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

      {/* ── Actions ── */}
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
          Clear
        </button>
      </div>

      {/* ── Event log ── */}
      <div
        ref={logRef}
        className="shrink-0 min-h-32 bg-gray-950 rounded-lg p-3 overflow-y-auto font-mono text-xs text-gray-300"
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
