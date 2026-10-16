import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import logo from "../assets/Dizon-Logo.png";
import { getToken } from "../hooks/useAuth";

/**
 * Naka-groups na sidebar — tugma sa 43 assets ng Dizon Farms.
 *
 * Ang bawat sub-item ay may `field` na nagsasabi kung aling column ang
 * hahanapin: "assetType" (default) o "category".
 */
const NAV = [
  { to: "/", label: "Dashboard", icon: "🏠" },

  {
    key: "assets",
    label: "Asset Management",
    icon: "💻",
    children: [
      { to: "/assets", label: "All Assets" },
      { to: "/assets?type=Laptop", label: "Laptops", field: "assetType" },
      { to: "/assets?type=Desktop", label: "Desktops", field: "assetType" },
      { to: "/assets?type=Monitor", label: "Monitors", field: "assetType" },
      { to: "/assets?cat=IT Equipment", label: "IT Equipment", field: "category" },
    ],
  },

  {
    key: "printers",
    label: "Printer Inventory",
    icon: "🖨️",
    children: [
      { to: "/assets?type=Printer", label: "All Printers", field: "assetType" },
      { to: "/assets?cat=Printer", label: "By Category", field: "category" },
    ],
  },

  {
    key: "network",
    label: "Network & Infrastructure",
    icon: "🌐",
    children: [
      { to: "/assets?type=Network Device", label: "Network Devices", field: "assetType" },
      { to: "/assets?type=UPS", label: "UPS", field: "assetType" },
      { to: "/assets?type=Accessory", label: "Accessories", field: "assetType" },
      { to: "/assets?cat=Other", label: "Other Equipment", field: "category" },
    ],
  },

  {
    key: "movements",
    label: "Movements",
    icon: "📦",
    children: [
      { to: "/assignments", label: "Assignments" },
      { to: "/assignments?view=receiving", label: "Receiving" },
      { to: "/assignments?view=dispatch", label: "Dispatch" },
    ],
  },

  { to: "/auditlogs", label: "Audit Logs", icon: "📝" },
];

export default function Layout({ children }) {
  const { pathname, search } = useLocation();
  const loggedIn = Boolean(getToken());

  const matchChild = (c) => {
    const [p, q] = c.to.split("?");
    if (pathname !== p) return false;
    if (!q) return !search;
    return search.includes(q);
  };

  const [openKeys, setOpenKeys] = useState(() => {
    const initial = {};
    NAV.forEach((it) => {
      if (it.children && it.children.some(matchChild)) initial[it.key] = true;
    });
    return initial;
  });

  useEffect(() => {
    NAV.forEach((it) => {
      if (!it.children) return;
      if (it.children.some(matchChild)) {
        setOpenKeys((k) => ({ ...k, [it.key]: true }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  const toggle = (key) => setOpenKeys((k) => ({ ...k, [key]: !k[key] }));

  const isActive = (to) => {
    const [p, q] = to.split("?");
    if (pathname !== p) return false;
    if (!q) return !search;
    return search.includes(q);
  };

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
                  className={`nav-item${isActive(it.to) ? " active" : ""}`}
                >
                  <span className="nav-icon">{it.icon}</span>
                  <span className="nav-label">{it.label}</span>
                </Link>
              );
            }

            const open = !!openKeys[it.key];
            const childActive = it.children.some((c) => isActive(c.to));

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
                        key={c.to}
                        to={c.to}
                        className={`nav-subitem${isActive(c.to) ? " active" : ""}`}
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
