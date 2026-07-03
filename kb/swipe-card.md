# Swipe-to-reveal / swipe-to-delete cards

**Applies to:** any list row in a client app (`client-time`, `client-play`, and
future apps) where a horizontal swipe reveals an action (delete, edit, archive)
behind the row — the iOS "swipe a row left to delete" gesture.

## The symptom (what "not working right" looks like)

This has bitten us in `client-play`'s score-tracker History list. Two failure
modes, both visible in a screenshot:

- **The action backdrop bleeds through every row.** The red "Delete" is visible
  under every row all the time, even when nothing is swiped.
- **The reveal gets stuck open**, or a swipe also fires the row's tap handler
  (opening the item you were trying to delete), or the vertical list won't scroll
  because the swipe handler is eating the gesture.

## Root cause

Three independent mistakes produce those symptoms:

1. **A translucent foreground card.** If the card that slides over the action
   uses a semi-transparent background (e.g. Tailwind `bg-gray-800/60`), the
   colored action behind it shows through at rest. The sliding card **must be
   fully opaque** so it completely hides the backdrop until it moves.
2. **Hand-rolled `touch*` events without pointer capture** and without
   `touch-action`. Touch events drop mid-gesture, and nothing tells the browser
   whether this gesture is a horizontal swipe (yours) or a vertical scroll
   (the browser's), so they fight.
3. **Persisting an "open" reveal state** instead of resolving the swipe into an
   action. Holding the row open invites the stuck-open and double-fire bugs.

## The pattern that works

Copy the proven implementation in
[`client-time/src/pages/LogPage.tsx`](../client-time/src/pages/LogPage.tsx)
(`EntryRow`). `client-play`'s
[`ScorePage.tsx`](../client-play/src/pages/ScorePage.tsx) (`HistoryRow`) is a
second working example (swipe-left-to-delete only).

Structure:

```tsx
// A relatively-positioned wrapper with overflow-hidden clips the backdrop.
<div className="relative overflow-hidden rounded-lg">
  {/* Colored action backdrop, absolutely positioned on the side it's revealed from */}
  <div className="absolute inset-y-0 right-0 w-[120px] bg-red-600 flex items-center justify-end pr-4 text-white">
    Delete
  </div>

  {/* OPAQUE foreground card that slides over the backdrop */}
  <button
    onClick={() => { if (!moved.current) onOpen(item) }}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerCancel={up}
    className="relative w-full text-left bg-gray-800 px-3 py-3"  // <-- opaque, no /opacity
    style={{
      transform: `translateX(${dragX}px)`,
      transition: isDragging ? 'none' : 'transform 0.2s ease',
      touchAction: 'pan-y',                                       // <-- let the list scroll vertically
    }}
  >
    …row content…
  </button>
</div>
```

Gesture handling (pointer events + capture + a direction lock):

```tsx
const [dragX, setDragX] = useState(0)
const [isDragging, setIsDragging] = useState(false)
const startX = useRef(0)
const startY = useRef(0)
const isScroll = useRef<boolean | null>(null)  // null until direction is decided
const moved = useRef(false)                     // did this gesture move horizontally?

function down(e: React.PointerEvent) {
  startX.current = e.clientX
  startY.current = e.clientY
  isScroll.current = null
  moved.current = false
  setIsDragging(true)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)  // keep the gesture
}

function move(e: React.PointerEvent) {
  if (!isDragging) return
  const dx = e.clientX - startX.current
  const dy = e.clientY - startY.current
  // Lock direction after the first ~5px: vertical → hand it back to the scroller.
  if (isScroll.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    isScroll.current = Math.abs(dy) > Math.abs(dx)
  }
  if (isScroll.current) return
  moved.current = true
  setDragX(Math.max(-120, Math.min(0, dx)))  // clamp; left-only here
}

function up() {
  setIsDragging(false)
  if (!isScroll.current && dragX <= -80) onRequestDelete(item.id)  // past threshold → act
  setDragX(0)                                                       // always snap back
}
```

Resolve the swipe into a **confirmation**, don't leave the reveal open. Flip the
row into an inline Cancel/Delete card (what both `LogPage` and `ScorePage` do):

```tsx
if (confirming) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-white text-sm font-medium mb-3">Delete “{item.name}”?</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-gray-700">Cancel</button>
        <button onClick={() => onConfirm(item)} className="flex-1 py-2 rounded-lg bg-red-600 text-white">Delete</button>
      </div>
    </div>
  )
}
```

## Checklist / proper steps

1. Wrapper: `relative overflow-hidden` so the backdrop is clipped to the row.
2. Backdrop: `absolute inset-y-0` pinned to the side it's revealed from, colored,
   with the action label/icon.
3. Foreground card: **opaque** background, `position: relative`,
   `transform: translateX(dragX)`, `touchAction: 'pan-y'`.
4. Use **pointer events** (`onPointerDown/Move/Up/Cancel`) and
   `setPointerCapture(e.pointerId)` on down.
5. **Lock direction** after ~5px; if the gesture is vertical, return early and let
   the list scroll.
6. **Clamp** the translate; snap back to 0 on release.
7. Past the threshold (~80px), **request an action and confirm it inline** — do
   not persist an "open" state.
8. Guard the row's `onClick` with a `moved` ref so a swipe doesn't also open the row.

## What to avoid

- **Do not** give the sliding card a translucent background (`bg-*/60`,
  `bg-*/70`, any `/opacity`). The backdrop will bleed through at rest. Opaque only.
- **Do not** hand-roll `onTouchStart/Move/End` without pointer capture and
  without `touch-action` — the gesture drops and fights vertical scroll.
- **Do not** omit `touchAction: 'pan-y'`; without it the horizontal handler and
  the native vertical scroll conflict.
- **Do not** leave the reveal snapped open as the end state. Resolve the swipe
  into an inline confirm (or an undo affordance) instead.
- **Do not** let the row's tap handler fire after a swipe — gate it on a `moved`
  ref.
- Don't reach for a swipe/gesture library for one row; the pattern above is a few
  lines and matches the rest of the codebase.

## Testing

Reproduce on a real iOS device (or Safari responsive-design mode with touch
emulation) — a desktop mouse drag exercises the pointer handlers but will not
surface scroll-vs-swipe conflicts or the translucency bleed the way a touch
device does. Verify: (a) nothing shows behind a row at rest, (b) the list still
scrolls vertically, (c) a full swipe asks to confirm, (d) a tap opens the row.
