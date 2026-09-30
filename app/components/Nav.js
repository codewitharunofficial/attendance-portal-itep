export default function Nav({ name, role, onLogout }) {
  return (
    <header className="nav"><div className="nav-in">
      <div className="brand"><div className="logo">A</div>Attendance</div>
      <div className="who">
        {name && <span className="nm"><b>{name}</b></span>}
        {role && <span className="chip">{role}</span>}
        <button className="ghost sm" onClick={onLogout}>Sign out</button>
      </div>
    </div></header>
  );
}
