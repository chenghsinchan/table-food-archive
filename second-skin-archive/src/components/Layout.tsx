import { Link, Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";

// App chrome: archive masthead + scrollable page + bottom nav.
// The landing page (/) opts out of the chrome via the router.
export default function Layout() {
  const { pathname } = useLocation();
  const title = titleFor(pathname);

  return (
    <div className="paper-grain min-h-full">
      <header className="sticky top-0 z-10 border-b border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
          <Link to="/start" className="flex items-baseline gap-2">
            <span className="display text-sm">Second Skin</span>
            <span className="mono-label text-mark">Archive</span>
          </Link>
          <span className="mono-label">{title}</span>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

function titleFor(path: string): string {
  if (path.startsWith("/body")) return "01 / Body";
  if (path.startsWith("/wardrobe")) return "03 / Wardrobe";
  if (path.startsWith("/item")) return "Clothing";
  if (path.startsWith("/add")) return "+ Add";
  if (path.startsWith("/journal")) return "04 / Journal";
  if (path.startsWith("/today")) return "Today";
  if (path.startsWith("/people")) return "05 / People";
  if (path.startsWith("/archive")) return "06 / Archive";
  return "";
}
