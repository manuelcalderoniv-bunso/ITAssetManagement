import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import logo from "../assets/Dizon-Logo.png";
import { getToken, getUser } from "../hooks/useAuth";
import { filterNavForRole } from "../utils/roles";
import NotificationBell from "./NotificationBell";
import QuickSearch from "./QuickSearch";

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
      { label: "Tablets", path: "/assets", field: "assetType", value: "Tablet" },
      { label: "IT Equipment", path: "/assets", field: "category", value: "IT Equipment" },
    ],
  },

  {
    key: "printers",
    label: "Printer Inventory",
    icon: "🖨️",
    children: [
      { label: "All Printers", path: "/assets", field: "assetType", value: "Printer" },
      { label: "By Category", path: "/assets", field: "category", value: "POS Thermal Printer" },
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
    key: "spare",
    label: "Spare Inventory",
    icon: "🧰",
    children: [
      { label: "Overview", path: "/spare" },
      { label: "Requests", path: "/spare", param: { view: "requests" } },
      { label: "Stock Items", path: "/spare", param: { view: "stock" } },
    ],
  },

  {
    key: "storage",
    label: "Cloud & Storage",
    icon: "☁️",
    children: [
      { label: "Overview", path: "/storage" },
      { label: "Alerts", path: "/storage", param: { view: "alerts" } },
    ],
  },

  {
    key: "licenses",
    label: "License Inventory",
    icon: "🔑",
    children: [
      { label: "All Licenses", path: "/licenses" },
      { label: "MS365 Standard", path: "/licenses", param: { product: "MS365" } },
      { label: "Office 2016", path: "/licenses", param: { product: "Office 2016" } },
      { label: "Palo Alto", path: "/licenses", param: { product: "Palo Alto" } },
      { label: "Omada", path: "/licenses", param: { product: "Omada" } },
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

  { to: "/procurement", label: "Purchase Request Log", icon: "🧾" },

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

  // Sidebar ayon sa role ng user (hal. Procurement = PRL lang).
  const nav = filterNavForRole(NAV, getUser()?.role);

  // Mga page na mahahanap sa Ctrl K (galing sa sidebar mismo).
  const pages = nav.flatMap((it) =>
    it.children
      ? it.children.map((c) => ({ label: `${it.label} › ${c.label}`, to: buildTo(c) }))
      : [{ label: it.label, to: it.to }]
  );

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
    nav.forEach((it) => {
      if (it.children && it.children.some(isActive)) initial[it.key] = true;
    });
    return initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    nav.forEach((it) => {
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
          {nav.map((it) => {
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

      <main className="content">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <QuickSearch pages={pages} />
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
