export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="logo">A</div>
        <h1>Every session, on record.</h1>
        <p>Mark attendance from the office and have your monthly counselling bill ready without the paperwork.</p>
        <ul><li>Location-verified check-ins</li><li>Monthly Excel and bill, automatically</li><li>Access approved by your admin</li></ul>
      </aside>
      <section className="auth-form"><div className="auth-card">{children}</div></section>
    </div>
  );
}
