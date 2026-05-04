import { Navigate, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../components/ui/Button";
import FormInput from "../components/ui/FormInput";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    password_confirmation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.password_confirmation) {
      showToast("Konfirmasi password tidak cocok.", "error");
      return;
    }

    if (form.password.length < 6) {
      showToast("Password minimal 6 karakter.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(form);
      navigate("/products", { replace: true });
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
        <h2 className="mb-3 text-center text-3xl">Buat Akun Baru</h2>
        <p className="mb-10 text-center text-brand-muted">
          Daftar sebagai customer untuk mulai berbelanja sambal terbaik.
        </p>

        <form className="auth-form mb-8" onSubmit={handleSubmit}>
          <FormInput
            id="regName"
            label="Nama Lengkap"
            type="text"
            name="name"
            placeholder="John Doe"
            value={form.name}
            onChange={updateField}
            required
          />
          <FormInput
            id="regEmail"
            label="Email"
            type="email"
            name="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={updateField}
            required
          />
          <FormInput
            id="regPhone"
            label="Nomor Telepon"
            type="tel"
            name="phone"
            placeholder="858-2355-4027"
            value={form.phone}
            onChange={updateField}
            required
          />
          <FormInput
            id="regAddress"
            label="Alamat Lengkap"
            as="textarea"
            name="address"
            placeholder="Jl. Contoh No. 123, Jakarta"
            value={form.address}
            onChange={updateField}
            required
          />
          <FormInput
            id="regPassword"
            label="Password"
            type="password"
            name="password"
            placeholder="********"
            value={form.password}
            onChange={updateField}
            required
          />
          <FormInput
            id="regConfirmPassword"
            label="Konfirmasi Password"
            type="password"
            name="password_confirmation"
            placeholder="********"
            value={form.password_confirmation}
            onChange={updateField}
            required
          />
          <Button type="submit" className="ui-ripple w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Daftar"}
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4 text-center text-brand-muted before:h-px before:flex-1 before:bg-brand-border after:h-px after:flex-1 after:bg-brand-border">
          atau
        </div>

        <p className="text-center text-brand-muted">
          Sudah punya akun? <Link to="/login" className="font-semibold text-brand-gold transition hover:text-brand-brown">Masuk</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
