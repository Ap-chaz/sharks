import { X } from "lucide-react";
import { useEffect, useRef } from "react";
/** Centered dialog with hairline borders, matching the public site. */
export function Modal({ open, title, onClose, children, }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open)
      return;
    const onKey = (event) => {
      if (event.key === "Escape")
        onClose();
    };
    document.addEventListener("keydown", onKey);
    // Keep the page behind the dialog from scrolling (matters most on phones).
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector("input, select, textarea");
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
  if (!open)
    return null;
  return (<div className="modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget)
        onClose();
    }}>
   <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
    <div className="modal-head">
     <h2>{title}</h2>
     <button type="button" onClick={onClose} aria-label="Close dialog">
      <X size={18}/>
     </button>
    </div>
    <div className="modal-body">{children}</div>
   </div>
  </div>);
}
/** Small confirmation dialog used before deleting a record. */
export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", onConfirm, onCancel, }) {
  return (<Modal open={open} title={title} onClose={onCancel}>
   <p className="confirm-copy">{description}</p>
   <div className="modal-actions">
    <button type="button" className="button button-outline" onClick={onCancel}>
     Cancel
    </button>
    <button type="button" className="button button-danger" onClick={onConfirm}>
     {confirmLabel}
    </button>
   </div>
  </Modal>);
}
