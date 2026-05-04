import { useEffect, useState } from "react";
import ProfileIcon from "../components/common/ProfileIcon";
import StatusCard from "../components/common/StatusCard";
import { useToast } from "../contexts/ToastContext";
import { BRAND_PROFILE, splitBrandHistory } from "../data/brandProfile";
import { businessProfileService } from "../services/businessProfileService";
import { normalizePhoneHref } from "../utils/contact";

const missionIconNames = ["quality", "community", "innovation", "digital", "service"];

function AboutPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await businessProfileService.get();

        if (isMounted) {
          setProfile(response);
        }
      } catch (error) {
        if (isMounted) {
          showToast(error.message, "error");
          setProfile(BRAND_PROFILE);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const activeProfile = profile ?? BRAND_PROFILE;
  const historyParagraphs = splitBrandHistory(activeProfile);
  const phoneHref = normalizePhoneHref(activeProfile.support_phone);

  return (
    <section className="page-section bg-brand-cream/40">
      <div className="container">
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <p className="content-eyebrow">Tentang Kami</p>
          <h1 className="page-title">Larisdy, Rasa Khas Sulawesi Utara yang Tumbuh dari Ketulusan</h1>
          <p className="page-subtitle">
            Brand kuliner lokal yang membawa sambal roa, cakalang, dan abon tuna dengan rasa autentik
            ke pengalaman belanja yang lebih modern.
          </p>
        </div>

        {isLoading ? (
          <StatusCard>
            <p>Memuat profil usaha...</p>
          </StatusCard>
        ) : (
          <div className="grid gap-8">
            <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
              <article className="content-card tw-card p-0" data-animate>
                <div className="p-7 md:p-9">
                  <p className="content-eyebrow">Sejarah Brand</p>
                  <h2 className="mb-5 text-3xl md:text-4xl">{activeProfile.company_name}</h2>
                  <div className="grid gap-4 text-base leading-8 text-brand-muted">
                    {historyParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </article>

              <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-brand-border bg-brand-black shadow-larisdy" data-animate>
                <img
                  src="/images/sambalroa.jpeg"
                  alt="Produk sambal roa Larisdy"
                  className="h-full min-h-[360px] w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
                  <p className="mb-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    Dari Sulawesi Utara
                  </p>
                  <h3 className="mb-3 text-2xl font-semibold">Autentik, higienis, dan dekat dengan bahan baku lokal.</h3>
                  <p className="text-sm leading-7 text-white/75">
                    Setiap produk membawa karakter ikan roa, cakalang, dan tuna yang menjadi kebanggaan daerah.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="content-card tw-card accent-card p-7 md:p-8" data-animate>
                <ProfileIcon name="vision" className="mb-5 bg-white text-brand-brown" />
                <p className="content-eyebrow">Visi</p>
                <h2 className="mb-4 text-3xl">Visi Kami</h2>
                <p className="content-copy">{activeProfile.vision}</p>
              </article>

              <article className="content-card tw-card p-7 md:p-8" data-animate>
                <p className="content-eyebrow">Misi</p>
                <h2 className="mb-6 text-3xl">Misi Larisdy</h2>
                <div className="grid gap-4">
                  {activeProfile.missions?.map((mission, index) => (
                    <div key={mission} className="flex gap-4 rounded-xl border border-brand-border bg-brand-cream/70 p-4">
                      <ProfileIcon name={missionIconNames[index] ?? "quality"} />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-brand-brown">
                          Misi {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="mt-1 leading-7 text-brand-muted">{mission}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <article className="content-card tw-card p-7 md:p-8" data-animate>
              <p className="content-eyebrow">Kontak Brand</p>
              <h2 className="mb-5 text-3xl">Hubungi Kami</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

export default AboutPage;
