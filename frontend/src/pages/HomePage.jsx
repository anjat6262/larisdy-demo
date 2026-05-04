import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/products/ProductCard";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { BRAND_PROFILE, splitBrandHistory } from "../data/brandProfile";
import { useHeroParallax } from "../hooks/useHeroParallax";
import { businessProfileService } from "../services/businessProfileService";
import { productService } from "../services/productService";

function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const heroOffset = useHeroParallax();
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHomepageAndEligibility() {
      try {
        const requests = [
          productService.list(),
          businessProfileService.get(),
        ];

        const [productResponse, businessProfile] = await Promise.all(requests);

        if (isMounted) {
          setProducts(productResponse.products.slice(0, 3));
          setProfile(businessProfile);
        }
      } catch (error) {
        if (isMounted) {
          showToast(error.message, "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHomepageAndEligibility();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const activeProfile = profile ?? BRAND_PROFILE;
  const historyParagraphs = splitBrandHistory(activeProfile);
  return (
    <>
      <section className="relative flex min-h-[calc(100vh-84px)] items-center overflow-hidden bg-brand-black py-20 text-white md:min-h-[720px] md:py-28">
        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1.2fr_0.9fr_0.9fr]" aria-hidden="true">
          <img src="/images/sambalroa.jpeg" alt="" className="h-full w-full object-cover object-center" />
          <img src="/images/abontuna.jpeg" alt="" className="hidden h-full w-full object-cover opacity-80 md:block" />
          <img src="/images/kacangbatik.jpeg" alt="" className="hidden h-full w-full object-cover opacity-80 md:block" />
        </div>
        <div className="absolute inset-0 z-[1] bg-black/70 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-black/20" />
        <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-6 md:px-8" style={{ transform: `translateY(${heroOffset}px)` }}>
          <div className="max-w-[720px] text-left">
            <h1 className="mb-6 max-w-[700px] text-5xl font-bold leading-tight text-white md:text-7xl">
              {activeProfile.hero_title}
            </h1>
            <p className="mb-8 max-w-[620px] text-lg leading-8 text-white/85 md:text-xl">
              {activeProfile.hero_subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="ui-ripple rounded-lg bg-white px-8 py-4 font-bold text-brand-black shadow-larisdy transition hover:-translate-y-1 hover:shadow-larisdy"
                onClick={() => navigate("/products")}
              >
                Belanja Sekarang
              </button>
              <button
                type="button"
                className="ui-ripple rounded-lg border border-white/70 px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-brand-black"
                onClick={() => navigate("/about")}
              >
                Tentang Larisdy
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section py-24">
        <div className="container">
          <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">Koleksi Terpilih</h2>
          <p className="mb-12 text-center text-lg text-brand-muted">
            Produk pilihan dengan cita rasa yang telah dipercaya.
          </p>

          {isLoading ? (
            <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
              <p>Memuat produk unggulan...</p>
            </div>
          ) : (
            <div className="my-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onSelect={() => navigate(`/products/${product.id}`)}
                />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Button
              type="button"
              className="ui-ripple"
              onClick={() => navigate("/products")}
            >
              Lihat Semua Koleksi
            </Button>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div
            className="grid gap-8 rounded-[22px] bg-brand-black p-7 text-white shadow-larisdy md:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-center"
            data-animate
          >
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">Sejarah Brand</p>
              <h2 className="mb-4 text-left text-4xl font-bold md:text-5xl">Cerita di Balik Larisdy</h2>
              <div className="grid gap-4">
                {historyParagraphs.map((paragraph) => (
                  <p key={paragraph} className="max-w-[720px] leading-8 text-white/80">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-larisdy">
              <img
                src="/images/larisdy%20logo%202.jpeg"
                alt="Logo Larisdy"
                className="h-full min-h-[320px] w-full bg-white object-contain p-8"
              />
            </div>
            <div className="lg:col-span-2">
              <button
                type="button"
                className="ui-ripple rounded-lg border border-white/70 px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-brand-black"
                onClick={() => navigate("/about")}
              >
                Baca Profil Lengkap
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomePage;
