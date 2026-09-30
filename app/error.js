"use client";
export default function Error({ error, reset }) {
  return (
    <main>
      <div className="panel" style={{ textAlign: "center", marginTop: 40 }}>
        <h2>Something went wrong</h2>
        <p className="sub" style={{ margin: "8px 0 18px" }}>{error?.message || "An unexpected error occurred."}</p>
        <button onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}
