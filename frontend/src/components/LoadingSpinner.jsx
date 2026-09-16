import "./LoadingSpinner.css";

export function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-state-ring" aria-hidden="true" />
      <p className="loading-state-label">{label}</p>
    </div>
  );
}
