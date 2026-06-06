import * as React from "react"

// Calls `onClose` when a pointer-down lands outside `ref`. The listener is only
// attached while `enabled` is true, so a closed modal never keeps a global
// listener around. Effect-only, so `document` is never touched during SSR.
export function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true,
) {
  // Keep the latest callback without re-subscribing the listener every render.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (!enabled) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const el = ref.current
      if (el && !el.contains(event.target as Node)) {
        onCloseRef.current()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [ref, enabled])
}
