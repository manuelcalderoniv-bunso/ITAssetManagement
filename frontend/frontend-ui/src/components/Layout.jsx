import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import logo from "../assets/Dizon-Logo.png";
import { getToken } from "../hooks/useAuth";

/**
 * Naka-groups na sidebar — tugma sa 43 assets ng Dizon Farms.
 *
 * Ang bawat sub-item ay may `field`: "assetType" (default) o "category".
 * Ang query ay itinatayo ng URLSearchParams, kaya tama ang encoding
 * (hal. "IT Equipment" -> IT+Equipment) at tugma ang aktibong highlight.
 */
const NAV = [
  { to: "/", label: "Dashboard", icon: "🏠" },

  {
    key: "assets",
    label: "Asset Management",
    icon: "💻",
    children: [
      { label: "All Assets", path: "/assets" },
      { label: "Laptops", path: "/assets", field: "assetType", value: "Laptop" },
      { label: "Desktops", path: "/assets", field: "assetType", value: "Desktop" },
      { label: "Monitors", path: "/assets", field: "assetType", value: "Monitor" },
      { label: "IT Equipment", path: "/assets", field: "category", value: "IT Equipment" },
    ],
  },

  {
    key: "printers",
    label: "Printer Inventory",
    icon: "🖨️",
    children: [
      { label: "All Printers", path: "/assets", field: "assetType", value: "Printer" },
      { label: "By Category", path: "/assets", field: "category", value: "Printer" },
    ],
  },

  {
    key: "network",
    label: "Network & Infrastructure",
    icon: "🌐",
    children: [
      { label: "Network Devices", path: "/assets", field: "assetType", value: "Network Device" },
      { label: "UPS", path: "/assets", field: "assetType", value: "UPS" },
      { label: "Accessories", path: "/assets", field: "assetType", value: "Accessory" },
      { label: "Other Equipment", path: "/assets", field: "category", value: "Other" },
    ],
  },

  {
    key: "movements",
    label: "Movements",
    icon: "📦",
    children: [
      { label: "Assignments", path: "/assignments" },
      { label: "Receiving", path: "/assignments", param: { view: "receiving" } },
      { label: "Dispatch", path: "/assignments", param: { view: "dispatch" } },
    ],
  },

  { to: "/auditlogs", label: "Audit Logs", icon: "📝" },
];

// Bumuo ng link para sa isang sub-item.
function buildTo(c) {
  if (!c.field || !c.value) {
    if (!c.param) return c.path;
    const q = new URLSearchParams(c.param).toString();
    return `${c.path}?${q}`;
  }
  const key = c.field === "category" ? "cat" : "type";
  const q = new URLSearchParams({ [key]: c.value }).toString();
  return `${c.path}?${q}`;
}

// Ang aktibong query para sa bawat sub-item, para sa paghahambing.
function buildQuery(c) {
  const to = buildTo(c);
  const i = to.indexOf("?");
  return i === -1 ? "" : to.slice(i + 1);
}

export default function Layout({ children }) {
  const { pathname, search } = useLocation();
  const loggedIn = Boolean(getToken());

  // Normalisahin: alisin ang unang "?" para pantay ang paghahambing.
  const currentQuery = search.startsWith("?") ? search.slice(1) : search;

  const isActive = (c) => {
    if (pathname !== c.path) return false;
    const q = buildQuery(c);
    if (!q) return !currentQuery;
    // Pareho ang parameter set, anuman ang pagkakasunod.
    const a = new URLSearchParams(currentQuery);
    const b = new URLSearchParams(q);
    for (const [k, v] of b) {
      if (a.get(k) !== v) return false;
    }
    return true;
  };

  const [openKeys, setOpenKeys] = useState(() => {
    const initial = {};
    NAV.forEach((it) => {
      if (it.children && it.children.some(isActive)) initial[it.key] = true;
    });
    return initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    NAV.forEach((it) => {
      if (!it.children) return;
      if (it.children.some(isActive)) {
        setOpenKeys((k) => ({ ...k, [it.key]: true }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  const toggle = (key) => setOpenKeys((k) => ({ ...k, [key]: !k[key] }));

  if (!loggedIn) {
    return <main className="content content-full">{children}</main>;
  }

  return (
    <div className="main-container">
      <aside className="sidebar">
        <img src={logo} alt="Dizon Farms logo" className="logo" />
        <h3 className="brand">IT Asset Management</h3>
        <p className="subtitle">Dizon Farms Produce, Inc.</p>

        <nav className="nav-groups">
          {NAV.map((it) => {
            if (!it.children) {
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`nav-item${pathname === it.to ? " active" : ""}`}
                >
                  <span className="nav-icon">{it.icon}</span>
                  <span className="nav-label">{it.label}</span>
                </Link>
              );
            }

            const open = !!openKeys[it.key];
            const childActive = it.children.some(isActive);

            return (
              <div className="nav-group" key={it.key}>
                <button
                  type="button"
                  className={`nav-item nav-parent${childActive ? " active" : ""}`}
                  onClick={() => toggle(it.key)}
                >
                  <span className="nav-icon">{it.icon}</span>
                  <span className="nav-label">{it.label}</span>
                  <span className={`nav-caret${open ? " open" : ""}`}>▾</span>
                </button>

                {open ? (
                  <div className="nav-sub">
                    {it.children.map((c) => (
                      <Link
                        key={c.label}
                        to={buildTo(c)}
                        className={`nav-subitem${isActive(c) ? " active" : ""}`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <UserMenu />
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
