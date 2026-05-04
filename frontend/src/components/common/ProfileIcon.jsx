const iconPaths = {
  vision: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </>
  ),
  quality: (
    <>
      <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
    </>
  ),
  community: (
    <>
      <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 21a5 5 0 0 1 10 0" />
      <path d="M11 21a5 5 0 0 1 10 0" />
    </>
  ),
  innovation: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M4.9 4.9 7.7 7.7" />
      <path d="m16.3 16.3 2.8 2.8" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m4.9 19.1 2.8-2.8" />
      <path d="m16.3 7.7 2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  digital: (
    <>
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="m9 11 2 2 4-4" />
    </>
  ),
  service: (
    <>
      <path d="M12 21s7-4 7-10V5l-7-3-7 3v6c0 6 7 10 7 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
};

function ProfileIcon({ name = "quality", className = "" }) {
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-black text-brand-gold shadow-larisdy-sm ${className}`.trim()}
      aria-hidden="true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {iconPaths[name] ?? iconPaths.quality}
      </svg>
    </span>
  );
}

export default ProfileIcon;
