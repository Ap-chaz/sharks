/* Small toast store so any module can report an action without prop drilling. */
let nextToastId = 0;
const listeners = new Set();
export function showToast(text, kind = "success") {
  const toast = { id: ++nextToastId, text, kind };
  listeners.forEach((notify) => notify(toast));
}
export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
