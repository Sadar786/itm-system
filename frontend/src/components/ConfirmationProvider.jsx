import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Trash2, X } from "lucide-react";
import { ConfirmationContext } from "./confirmationContext";
import "./confirmation.css";

export function ConfirmationProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const resolveRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    setPrompt(options);
  }), []);

  const finish = useCallback((accepted) => {
    dialogRef.current?.close();
    resolveRef.current?.(accepted);
    resolveRef.current = null;
    setPrompt(null);
  }, []);

  useEffect(() => {
    if (prompt) {
      dialogRef.current.showModal();
      cancelRef.current?.focus();
    }
  }, [prompt]);

  useEffect(() => () => {
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const destructive = prompt?.destructive !== false;
  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {prompt && createPortal(
      <dialog ref={dialogRef} className={`confirmation-dialog${destructive ? " confirmation-dialog--danger" : ""}`}
        aria-labelledby={titleId} aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); finish(false); }}>
        <button className="confirmation-close" type="button" aria-label="Close confirmation" onClick={() => finish(false)}><X size={19} /></button>
        <div className="confirmation-icon" aria-hidden="true">{destructive ? <Trash2 size={24} /> : <CircleHelp size={24} />}</div>
        <h2 id={titleId}>{prompt.title || "Confirm action"}</h2>
        <p id={descriptionId}>{prompt.message}</p>
        {prompt.reference && <div className="confirmation-reference"><span>Reference</span><strong>{prompt.reference}</strong></div>}
        {prompt.items?.length > 0 && <section className="confirmation-products" aria-label="Products to delete">
          <div className="confirmation-products-heading">
            <h3>Products ({prompt.items.length})</h3>
            <span>Quantity</span>
          </div>
          <ul className="confirmation-products-list" tabIndex={0} aria-label="Review products and quantities">
            {prompt.items.map((item, index) => <li key={item.id || index}>
              <span className="confirmation-product-name">{item.name}</span>
              <strong className="confirmation-product-quantity">{item.quantity}</strong>
            </li>)}
          </ul>
        </section>}
        <div className="confirmation-actions">
          <button ref={cancelRef} type="button" className="confirmation-cancel" onClick={() => finish(false)}>Cancel</button>
          <button type="button" className="confirmation-accept" onClick={() => finish(true)}>{prompt.confirmLabel || "Confirm"}</button>
        </div>
      </dialog>, document.body,
    )}
  </ConfirmationContext.Provider>;
}
