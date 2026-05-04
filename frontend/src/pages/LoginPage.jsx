import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../components/ui/Button";
import FormInput from "../components/ui/FormInput";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function resolveRedirectPath(authenticatedUser, requestedPath) {
  const defaultPath = authenticatedUser.role === "admin" ? "/admin" : "/";

  if (!requestedPath) {
    return defaultPath;
  }

  if (requestedPath.startsWith("/admin")) {
    return authenticatedUser.role === "admin" ? requestedPath : defaultPath;
  }

  if (requestedPath === "/orders" || requestedPath === "/checkout") {
    return authenticatedUser.role === "customer" ? requestedPath : defaultPath;
  }

  return requestedPath;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={resolveRedirectPath(user, location.state?.from)} replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function fillAdminCredentials() {
    setForm({
      email: "admin@larisdy.com",
      password: "password",
    });
  }

  function fillCustomerCredentials() {
    setForm({
      email: "user@gmail.com",
      password: "password",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(form);
      const redirectTo = resolveRedirectPath(authenticatedUser, location.state?.from);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[linear-gradient(90deg,rgba(26,26,26,0.84),rgba(26,26,26,0.34)),url('/images/sambalcakalang.jpeg')] bg-cover bg-center px-4 py-12">
      <div className="w-full max-w-[540px] rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy md:p-12">
        <div className="mb-8 flex items-center justify-center gap-3 text-2xl font-bold">
          <img src="/images/logo.jpeg" alt="Larisdy Logo" className="logo-image" />
          <span className="logo-text">Larisdy</span>
        </div>
        <h2 className="mb-3 text-center text-3xl">Selamat Datang Kembali</h2>
        <p className="mb-10 text-center text-brand-muted">Masuk ke akun Anda untuk melanjutkan.</p>

        <form className="auth-form mb-8" onSubmit={handleSubmit}>
          <FormInput
            id="loginEmail"
            label="Email"
            type="email"
            name="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={updateField}
            required
          />
          <FormInput
            id="loginPassword"
            label="Password"
            type="password"
            name="password"
            placeholder="********"
            value={form.password}
            onChange={updateField}
            required
          />
          <Button type="submit" className="ui-ripple w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4 text-center text-brand-muted before:h-px before:flex-1 before:bg-brand-border after:h-px after:flex-1 after:bg-brand-border">
          atau
        </div>

        <p className="text-center text-brand-muted">
          Belum punya akun? <Link to="/register" className="font-semibold text-brand-gold transition hover:text-brand-brown">Daftar Sekarang</Link>
        </p>

        <div className="mt-8 rounded-xl border border-brand-border bg-brand-cream p-6 text-center text-sm text-brand-muted">
          <p>
            <strong className="text-brand-black">Akun Seeder:</strong>
          </p>
          <p>Admin: admin@larisdy.com / password</p>
          <p>Customer: user@gmail.com / password</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={fillAdminCredentials}>
              Isi Admin
            </Button>
            <Button type="button" variant="secondary" className="ui-ripple" onClick={fillCustomerCredentials}>
              Isi Customer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
