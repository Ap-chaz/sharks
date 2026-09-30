import { useEffect, useState } from "react";
import { subscribeToToasts } from "@/lib/toast";
/** Renders toast messages published through the tiny store in lib/toast. */
export function Toaster() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => subscribeToToasts((toast) => {
    setToasts((current) => [...current.slice(-2), toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 3200);
  }), []);
  if (!toasts.length)
    return null;
  return (<div className="toaster" role="status" aria-live="polite">
   {toasts.map((toast) => (<div key={toast.id} className={`toast toast-${toast.kind}`}>
     <span className="toast-dot" aria-hidden="true"/>
     {toast.text}
    </div>))}
  </div>);
}
