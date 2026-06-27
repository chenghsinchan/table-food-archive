import { NavLink, useNavigate } from "react-router-dom";

// Five-slot bottom navigation. The centre "Add" is an emphasised action.
type NavItem = {
  to: string;
  label: string;
  icon: () => JSX.Element;
  center?: boolean;
};

const items: NavItem[] = [
  { to: "/body", label: "Body", icon: BodyIcon },
  { to: "/wardrobe", label: "Wardrobe", icon: WardrobeIcon },
  { to: "/add", label: "Add", icon: AddIcon, center: true },
  { to: "/journal", label: "Journal", icon: JournalIcon },
  { to: "/archive", label: "Archive", icon: ArchiveIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-ink bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map(({ to, label, icon: Icon, center }) => (
          <li key={to} className="flex-1">
            {center ? (
              <button
                onClick={() => navigate(to)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1"
                aria-label={label}
              >
                <span className="flex h-9 w-9 items-center justify-center bg-ink text-paper">
                  <Icon />
                </span>
                <span className="mono-label text-[0.55rem]">{label}</span>
              </button>
            ) : (
              <NavLink
                to={to}
                className="flex h-16 flex-col items-center justify-center gap-1"
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-mark" : "text-ink-soft"}>
                      <Icon />
                    </span>
                    <span
                      className={`mono-label text-[0.55rem] ${
                        isActive ? "text-ink" : ""
                      }`}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BodyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="5" r="2.4" />
      <path d="M12 7.5v9M12 9l-4 2M12 9l4 2M9 21l3-4.5L15 21" />
    </svg>
  );
}
function WardrobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4c-1.5 0-2.5 1-2.5 2 0 1 1 1.4 1 1.4L4 12v3h16v-3l-6.5-4.6s1-.4 1-1.4c0-1-1-2-2.5-2Z" />
    </svg>
  );
}
function AddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function JournalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3" width="14" height="18" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="4" />
      <path d="M5 8v12h14V8M10 12h4" />
    </svg>
  );
}
