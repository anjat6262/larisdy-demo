import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import NotificationBell from "../common/NotificationBell";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";

const CUSTOMER_NAV_ITEMS = [
  { to: "/", label: "Beranda", end: true },
  { to: "/products", label: "Produk" },
  { to: "/about", label: "Tentang" },
  { to: "/contact", label: "Kontak" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/orders", label: "Pesanan" },
  { to: "/admin/products", label: "Produk" },
  { to: "/admin/reports", label: "Laporan" },
];

function SearchIcon({ className = "h-5 w-5 shrink-0 fill-none stroke-current" } = {}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

function CartIcon({ className = "h-5 w-5 fill-none stroke-current" } = {}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.68 16h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function MenuIcon({ isOpen, className = "h-5 w-5 fill-none stroke-current" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {isOpen ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function getInitial(name) {
  return name ? name.slice(0, 1).toUpperCase() : "U";
}

function resolveAdminPageTitle(pathname) {
  if (pathname.startsWith("/admin/orders")) {
    return "Pesanan";
  }

  if (pathname.startsWith("/admin/products")) {
    return "Produk";
  }

  if (pathname.startsWith("/admin/reports")) {
    return "Laporan";
  }

  return "Dashboard";
}

function Header({ scrolled }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const accountDropdownRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const adminPageTitle = useMemo(
    () => resolveAdminPageTitle(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (!location.pathname.startsWith("/products")) {
      return;
    }

    setSearchQuery(new URLSearchParams(location.search).get("search") ?? "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isAccountOpen || isAdmin) {
      return undefined;
    }

    function handleDocumentPointerDown(event) {
      if (!accountDropdownRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isAccountOpen, isAdmin]);

  function closeMenus() {
    setIsMobileMenuOpen(false);
    setIsAccountOpen(false);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchQuery.trim();

    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    closeMenus();
  }

  function handleLogout() {
    closeMenus();
    logout();
  }

  function renderCustomerAccountMenu() {
    if (isLoading) {
      return (
        <div className="hidden min-h-10 items-center rounded-full bg-brand-cream px-4 text-sm font-semibold text-brand-muted sm:inline-flex">
          Memuat akun...
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            className="rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-black transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            onClick={() => {
              navigate("/register");
              closeMenus();
            }}
          >
            Daftar
          </button>
          <button
            type="button"
            className="rounded-full bg-brand-black px-4 py-2 text-sm font-semibold text-brand-white shadow-larisdy-sm transition hover:bg-brand-brown focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            onClick={() => {
              navigate("/login");
              closeMenus();
            }}
          >
            Masuk
          </button>
        </div>
      );
    }

    return (
      <div className="relative" ref={accountDropdownRef}>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-border bg-white pl-1.5 pr-3 text-sm font-semibold text-brand-black transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
          aria-label="Buka menu akun customer"
          aria-expanded={isAccountOpen}
          aria-haspopup="menu"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsAccountOpen((current) => !current);
          }}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-black text-sm font-bold text-brand-white">
            {getInitial(user?.name)}
          </span>
          <span className="hidden max-w-[110px] truncate lg:block">{user?.name}</span>
        </button>

        {isAccountOpen ? (
          <div
            className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-56 overflow-hidden rounded-xl border border-brand-border bg-white py-2 text-sm shadow-larisdy"
            role="menu"
          >
            <button
              type="button"
              className="block w-full px-4 py-3 text-left font-semibold text-brand-black transition hover:bg-brand-cream"
              role="menuitem"
              onClick={() => {
                navigate("/account");
                closeMenus();
              }}
            >
              Profil/Akun
            </button>
            <button
              type="button"
              className="block w-full px-4 py-3 text-left font-semibold text-brand-black transition hover:bg-brand-cream"
              role="menuitem"
              onClick={() => {
                navigate("/orders");
                closeMenus();
              }}
            >
              Pesanan Saya
            </button>
            <button
              type="button"
              className="block w-full border-t border-brand-border px-4 py-3 text-left font-semibold text-red-700 transition hover:bg-red-50"
              role="menuitem"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderAccountDropdown({ admin = false } = {}) {
    if (isLoading) {
      return (
        <div className="account-loading" aria-live="polite">
          Memuat akun...
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="guest-actions">
          <button type="button" className="btn-secondary ui-ripple" onClick={() => navigate("/register")}>
            Daftar
          </button>
          <button type="button" className="btn-primary ui-ripple" onClick={() => navigate("/login")}>
            Masuk
          </button>
        </div>
      );
    }

    return (
      <div className="account-dropdown">
        <button
          type="button"
          className="account-trigger"
          aria-label="Buka menu akun"
          aria-expanded={isAccountOpen}
          onClick={() => setIsAccountOpen((current) => !current)}
        >
          <span className="account-avatar-small">{getInitial(user?.name)}</span>
          <span className="account-trigger-copy">
            <span>{user?.name}</span>
            <small>{user?.role}</small>
          </span>
        </button>

        <div className={`account-menu-popover ${isAccountOpen ? "open" : ""}`.trim()}>
          <button type="button" onClick={() => { navigate("/account"); closeMenus(); }}>
            Profil Akun
          </button>
          {admin ? (
            <>
              <button type="button" onClick={() => { navigate("/admin"); closeMenus(); }}>
                Seller Center
              </button>
              <button type="button" onClick={() => { navigate("/admin/reports"); closeMenus(); }}>
                Laporan Penjualan
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { navigate("/orders"); closeMenus(); }}>
              Pesanan Saya
            </button>
          )}
          <button type="button" className="danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <>
        <aside className="admin-sidebar bg-brand-black text-brand-white shadow-larisdy" aria-label="Navigasi admin">
          <button type="button" className="admin-sidebar-brand reset-button" onClick={() => navigate("/admin")}>
            <img src="/images/logo.jpeg" alt="Larisdy Logo" className="logo-image" />
            <span>
              <strong>Larisdy</strong>
              <small>Seller Center</small>
            </span>
          </button>

          <nav className="admin-sidebar-nav">
            <ul>
              {ADMIN_NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `admin-sidebar-link rounded-lg transition ${isActive ? "active bg-brand-gold text-brand-black" : "hover:bg-white/10"}`.trim()
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <header className={`admin-topbar border-b border-black/5 bg-white/95 backdrop-blur ${scrolled ? "scrolled shadow-larisdy-sm" : ""}`}>
          <div>
            <p className="content-eyebrow">Seller Center</p>
            <h1>{adminPageTitle}</h1>
          </div>
          <div className="admin-topbar-actions">
            <NotificationBell variant="admin" />
            {renderAccountDropdown({ admin: true })}
            {isAuthenticated ? (
              <button type="button" className="btn-primary ui-ripple desktop-logout" onClick={handleLogout}>
                Keluar
              </button>
            ) : null}
          </div>
        </header>
      </>
    );
  }

  const navLinkClass = ({ isActive }) =>
    [
      "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
      isActive
        ? "bg-brand-black text-brand-gold shadow-larisdy-sm"
        : "text-brand-muted hover:bg-brand-cream hover:text-brand-black",
    ].join(" ");

  return (
    <header
      className={`sticky top-0 z-50 border-b border-brand-border bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-larisdy-sm" : ""
      }`}
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_auto_minmax(260px,1fr)_auto] lg:gap-5 lg:px-8">
        <Link
          to="/"
          className="inline-flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
          onClick={closeMenus}
        >
          <img src="/images/logo.jpeg" alt="Larisdy Logo" className="h-11 w-11 rounded-xl object-contain shadow-larisdy-sm" />
          <span className="hidden text-2xl font-bold tracking-normal text-brand-black sm:block">Larisdy</span>
        </Link>

        <nav className="hidden items-center justify-center lg:flex" aria-label="Navigasi customer utama">
          <ul className="flex list-none items-center gap-1">
            {CUSTOMER_NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            {isAuthenticated ? (
              <li>
                <NavLink to="/orders" className={navLinkClass}>
                  Pesanan Saya
                </NavLink>
              </li>
            ) : null}
          </ul>
        </nav>

        <form
          className="order-3 col-span-full flex min-h-11 items-center rounded-full border border-brand-border bg-brand-cream px-3 transition focus-within:border-brand-gold focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-gold/30 lg:order-none lg:col-auto"
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Pencarian produk"
        >
          <SearchIcon />
          <input
            type="search"
            aria-label="Cari produk Larisdy"
            placeholder="Cari produk Larisdy..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-brand-black outline-none placeholder:text-brand-muted"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-black px-4 py-1.5 text-xs font-bold text-brand-white transition hover:bg-brand-brown focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            aria-label="Cari produk"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center justify-end gap-2">
          <NotificationBell variant="customer" />

          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-brand-border bg-white text-brand-black transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            onClick={() => {
              navigate("/cart");
              closeMenus();
            }}
            aria-label="Buka keranjang belanja"
          >
            <CartIcon />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-gold px-1 text-[0.7rem] font-bold leading-none text-brand-black">
                {itemCount}
              </span>
            ) : null}
          </button>

          {renderCustomerAccountMenu()}

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-brand-border bg-white text-brand-black transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 lg:hidden"
            aria-label={isMobileMenuOpen ? "Tutup menu customer" : "Buka menu customer"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="customer-mobile-menu"
            onClick={() => {
              setIsAccountOpen(false);
              setIsMobileMenuOpen((current) => !current);
            }}
          >
            <MenuIcon isOpen={isMobileMenuOpen} />
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div id="customer-mobile-menu" className="border-t border-brand-border bg-white lg:hidden">
          <nav aria-label="Navigasi customer mobile">
            <ul className="mx-auto grid max-w-[1400px] list-none gap-2 px-4 py-4 sm:px-6">
              {CUSTOMER_NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={(state) => `${navLinkClass(state)} w-full justify-center`}
                    onClick={closeMenus}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              {isAuthenticated ? (
                <>
                  <li>
                    <NavLink
                      to="/orders"
                      className={(state) => `${navLinkClass(state)} w-full justify-center`}
                      onClick={closeMenus}
                    >
                      Pesanan Saya
                    </NavLink>
                  </li>
                  <li className="grid gap-2 border-t border-brand-border pt-3 sm:hidden">
                    <button
                      type="button"
                      className="rounded-full border border-brand-border bg-white px-4 py-2 text-left text-sm font-semibold text-brand-black transition hover:border-brand-gold hover:bg-brand-cream"
                      onClick={() => {
                        navigate("/account");
                        closeMenus();
                      }}
                    >
                      Profil/Akun
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-red-700 px-4 py-2 text-left text-sm font-semibold text-white transition hover:bg-red-800"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li className="grid gap-2 border-t border-brand-border pt-3 sm:hidden">
                  <button
                    type="button"
                    className="rounded-full border border-brand-border bg-white px-4 py-2 text-left text-sm font-semibold text-brand-black transition hover:border-brand-gold hover:bg-brand-cream"
                    onClick={() => {
                      navigate("/login");
                      closeMenus();
                    }}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-brand-black px-4 py-2 text-left text-sm font-semibold text-brand-white transition hover:bg-brand-brown"
                    onClick={() => {
                      navigate("/register");
                      closeMenus();
                    }}
                  >
                    Daftar
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default Header;
