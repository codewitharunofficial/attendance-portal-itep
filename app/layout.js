import "./globals.css";
export const metadata = { title: "Counsellor Attendance", description: "Mark attendance from the office" };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
