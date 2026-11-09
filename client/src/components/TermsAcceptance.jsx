import { useEffect, useRef, useState } from "react";
import { TermsDocument } from "../legal/terms";

function TermsAcceptance({ operator, onAccept, onClose, busy = false, error = "" }) {
  const readerRef = useRef(null);
  const [readToEnd, setReadToEnd] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const element = readerRef.current;
    if (element && element.scrollHeight <= element.clientHeight + 2) setReadToEnd(true);
  }, []);

  function updateReadState(event) {
    const element = event.currentTarget;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) setReadToEnd(true);
  }

  return (
    <div className="modal-backdrop terms-backdrop" role="presentation">
      <section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
        {onClose && <button className="modal-close" onClick={onClose} aria-label="Close">×</button>}
        <header className="terms-modal-header">
          <p className="eyebrow">PLEASE READ BEFORE CONTINUING</p>
          <h2 id="terms-modal-title">{onAccept ? "Terms and Conditions" : "AutoHub Terms and Conditions"}</h2>
          <p>These rules apply to everyone using AutoHub to browse, sell, buy, or rent vehicles.</p>
        </header>
        <div className="terms-reader" ref={readerRef} onScroll={updateReadState} tabIndex={0} aria-label="Terms and Conditions">
          <TermsDocument operator={operator} />
        </div>
        {onAccept ? (
          <div className="terms-consent-area">
            <p className="terms-read-hint">{readToEnd ? "You’ve reached the end. Review the box below to continue." : "Scroll through the full Terms and Conditions to continue."}</p>
            <label className={"terms-checkbox" + (!readToEnd ? " is-disabled" : "")}>
              <input type="checkbox" disabled={!readToEnd || busy} checked={checked} onChange={(event) => setChecked(event.target.checked)} />
              <span>I have read and agree to the AutoHub Terms and Conditions.</span>
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-primary terms-accept-button" disabled={!checked || !readToEnd || busy} onClick={onAccept}>
              {busy ? "Saving your acceptance…" : "Accept and continue"}
            </button>
          </div>
        ) : <div className="terms-consent-area"><button className="button button-outline" onClick={onClose}>Close</button></div>}
      </section>
    </div>
  );
}

export default TermsAcceptance;
