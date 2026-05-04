import Header from "./Header";
import Footer from "./Footer";
import { useUiEffects } from "../../hooks/useUiEffects";
import { useAuth } from "../../contexts/AuthContext";

function AppShell({ children }) {
  const { isScrolled } = useUiEffects();
  const { isAdmin } = useAuth();

  return (
    <div className={`app-shell ${isAdmin ? "admin-shell" : ""}`.trim()}>
      <Header scrolled={isScrolled} />
      <main className="app-main">{children}</main>
      {isAdmin ? null : <Footer />}
    </div>
  );
}

export default AppShell;
