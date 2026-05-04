import { useEffect, useState } from "react";
import ProfileIcon from "../components/common/ProfileIcon";
import Button from "../components/ui/Button";
import FormInput from "../components/ui/FormInput";
import { useToast } from "../contexts/ToastContext";
import { BRAND_PROFILE } from "../data/brandProfile";
import { businessProfileService } from "../services/businessProfileService";
import { contactService } from "../services/contactService";
import { normalizePhoneHref } from "../utils/contact";

function ContactPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    let isMounted = true;

    businessProfileService
      .get()
      .then((response) => {
        if (isMounted) {
          setProfile(response);
        }
      })
      .catch((error) => {
        if (isMounted) {
          showToast(error.message, "error");
          setProfile(BRAND_PROFILE);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await contactService.create(form);
      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
      showToast("Pesan berhasil dikirim.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeProfile = profile ?? BRAND_PROFILE;
  const phoneHref = normalizePhoneHref(activeProfile.support_phone);

  return (
    <section className="page-section bg-brand-cream/40">
      <div className="container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="content-eyebrow">Kontak</p>
          <h1 className="page-title admin-page-title">Customer Care Larisdy</h1>
          <p className="page-subtitle admin-page-subtitle">
            Hubungi kami untuk pertanyaan produk, pesanan, pembayaran, atau kerja sama.
          </p>
        </div>

        <div className="contact-layout items-start">
          <article className="content-card tw-card p-7 md:p-8" data-animate>
            <p className="content-eyebrow">Customer Care</p>
            <h2 className="mb-4 text-3xl">Informasi Kontak</h2>
            <p className="content-copy">
              Gunakan kontak resmi berikut agar pertanyaan pesanan dan produk bisa ditangani dengan jelas.
            </p>

            <div className="mt-7 grid gap-4">
              <a
                href={phoneHref}
                className="flex gap-4 rounded-xl border border-brand-border bg-white p-4 text-brand-black transition hover:border-brand-gold hover:bg-brand-cream"
              >
                <ProfileIcon name="service" />
                <span>
                  <strong className="block">Telepon</strong>
                  <span className="text-brand-muted">{activeProfile.support_phone}</span>
                </span>
              </a>

              <a
                href={`mailto:${activeProfile.support_email}`}
                className="flex gap-4 rounded-xl border border-brand-border bg-white p-4 text-brand-black transition hover:border-brand-gold hover:bg-brand-cream"
              >
                <ProfileIcon name="mail" />
                <span>
                  <strong className="block">Email</strong>
                  <span className="text-brand-muted">{activeProfile.support_email}</span>
                </span>
              </a>

              <div className="flex gap-4 rounded-xl border border-brand-border bg-white p-4">
                <ProfileIcon name="location" />
                <span>
                  <strong className="block">Alamat</strong>
                  <span className="text-brand-muted">{activeProfile.address}</span>
                </span>
              </div>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-white/40 bg-white/60">
              <img
                src="/images/sambalcakalang.jpeg"
                alt="Produk cakalang Larisdy"
                className="h-56 w-full object-cover"
              />
            </div>
          </article>

          <form className="content-card tw-card p-7 md:p-8" onSubmit={handleSubmit} data-animate>
            <p className="content-eyebrow">Form Kontak</p>
            <h2 className="mb-5 text-3xl">Kirim Pesan</h2>

            <FormInput
              id="contactName"
              label="Nama"
              name="name"
              value={form.name}
              onChange={updateField}
              required
            />

            <FormInput
              id="contactEmail"
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              required
            />

            <FormInput
              id="contactPhone"
              label="Nomor Telepon"
              name="phone"
              value={form.phone}
              onChange={updateField}
            />

            <FormInput
              id="contactMessage"
              label="Pesan"
              as="textarea"
              name="message"
              value={form.message}
              onChange={updateField}
              required
            />

            <Button type="submit" className="ui-ripple w-full" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim..." : "Kirim Pesan"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ContactPage;
