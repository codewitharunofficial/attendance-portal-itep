import Link from "next/link";
export default function NotFound() {
  return (
    <main>
      <div className="panel" style={{ textAlign: "center", marginTop: 40 }}>
        <h2>Page not found</h2>
        <p className="sub" style={{ margin: "8px 0 18px" }}>That page doesn’t exist.</p>
        <Link href="/"><button>Go to sign in</button></Link>
      </div>
    </main>
  );
}
