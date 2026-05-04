import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND_PROFILE } from "../../data/brandProfile";
import { businessProfileService } from "../../services/businessProfileService";
import { normalizePhoneHref } from "../../utils/contact";

function Footer() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;

    businessProfileService
      .get()
      .then((response) => {
        if (isMounted) {
          setProfile(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeProfile = profile ?? BRAND_PROFILE;
  const phoneHref = normalizePhoneHref(activeProfile.support_phone);

  return (
    <footer className="footer bg-brand-black">
      <div className="container">
        <div className="footer-grid gap-8">
          <div>
            <div className="footer-logo">
              <img src="/images/logo.jpeg" alt="Larisdy Logo" className="logo-image" />
              <span className="logo-text">Larisdy</span>
            </div>
            <p className="max-w-md leading-7 text-white/70">{activeProfile.hero_subtitle}</p>
          </div>
          <div>
            <h4>Navigasi</h4>
            <ul className="footer-links">
              <li>
                <Link to="/">Beranda</Link>
              </li>
              <li>
                <Link to="/products">Produk</Link>
              </li>
              <li>
                <Link to="/about">Tentang</Link>
              </li>
              <li>
                <Link to="/contact">Kontak</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Kontak</h4>
            <ul className="footer-links grid gap-3">
              <li>
                Email:{" "}
                <a href={`mailto:${activeProfile.support_email}`}>
                  {activeProfile.support_email}
                </a>
              </li>
              <li>
                Telepon:{" "}
                <a href={phoneHref}>{activeProfile.support_phone}</a>
              </li>
              <li>
                <span className="block text-white/45">Alamat</span>
                <span>{activeProfile.address}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Larisdy. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
