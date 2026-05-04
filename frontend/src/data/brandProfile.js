export const BRAND_PROFILE = {
  company_name: "Larisdy",
  address: "Sentra IKM Kakenturan 1, Kec. Maesa, Sulawesi Utara",
  support_email: "Larisdy.5@gmail.com",
  support_phone: "858-2355-4027",
  hero_title: "Larisdy",
  hero_subtitle:
    "Sambal roa, cakalang, dan abon tuna bercita rasa autentik dari Larisdy.",
  vision:
    "Menjadi brand kuliner yang unggul, berkualitas, dan dikenal luas hingga pasar nasional dan internasional, dengan cita rasa autentik yang membanggakan daerah.",
  missions: [
    "Menghasilkan produk olahan ikan (sambal roa, cakalang, abon tuna) yang higienis, berkualitas, dan bercita rasa khas.",
    "Memberdayakan bahan baku lokal dan mendukung nelayan serta UMKM sekitar.",
    "Mengembangkan inovasi produk kuliner yang mengikuti selera pasar tanpa meninggalkan identitas lokal.",
    "Memanfaatkan digital marketing untuk memperluas jangkauan penjualan.",
    "Memberikan pelayanan terbaik kepada pelanggan dengan kejujuran dan konsistensi kualitas.",
  ],
  history:
    "Larisdy adalah brand kuliner yang didirikan oleh Yulianti Narulita, seorang pelaku UMKM yang memiliki semangat kuat untuk mandiri dan berkembang melalui usaha.\n\n" +
    "Perjalanan Larisdy dimulai dari keinginan untuk membantu perekonomian keluarga sekaligus memanfaatkan potensi bahan baku lokal, khususnya ikan khas Sulawesi seperti roa, cakalang, dan tuna. Berawal dari produksi sederhana dan penjualan dalam skala kecil, Larisdy mulai dikenal karena cita rasanya yang khas, autentik, dan dibuat dengan penuh ketulusan.\n\n" +
    "Dalam perjalanannya, Larisdy terus berkembang melalui berbagai pelatihan dan pembinaan, termasuk dari Bank Indonesia, yang membantu meningkatkan kualitas produk, branding, dan pemasaran. Produk Larisdy pun mulai masuk ke toko-toko besar seperti Dekranasda dan dipercaya dalam berbagai kegiatan dan pameran.\n\n" +
    "Meski sempat menghadapi tantangan besar, terutama saat pandemi, Larisdy tetap bertahan dan bangkit dengan semangat inovasi dan konsistensi. Hingga saat ini, Larisdy terus berkomitmen menghadirkan produk kuliner berkualitas yang tidak hanya lezat, tetapi juga membawa identitas dan kebanggaan daerah Sulawesi Utara.",
};

export function mergeBrandProfile(apiProfile = {}) {
  return {
    ...BRAND_PROFILE,
    ...apiProfile,
    missions: apiProfile.missions?.length ? apiProfile.missions : BRAND_PROFILE.missions,
  };
}

export function splitBrandHistory(profile = BRAND_PROFILE) {
  return (profile.history ?? BRAND_PROFILE.history)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
