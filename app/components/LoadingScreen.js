// A reusable, on-brand loading state. Customize via props (message/subtitle/fullscreen) or by
// editing the CSS variables in globals.css (--brand, --brand-2, --accent) — this component and
// the inline <Spinner/> both read from the same palette, so a theme change updates both at once.
export default function LoadingScreen({ message = "Loading…", subtitle, fullscreen = true }) {
  return (
    <div className={`loading-screen${fullscreen ? " full" : ""}`} role="status" aria-live="polite">
      <div className="loading-mark">
        <span className="loading-ring" />
        <span className="loading-logo">A</span>
      </div>
      <p className="loading-msg">{message}</p>
      {subtitle && <p className="loading-sub">{subtitle}</p>}
    </div>
  );
}

// Small inline spinner for busy buttons, e.g. <button>{busy && <Spinner/>}Save</button>
export function Spinner({ size = 14 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}
