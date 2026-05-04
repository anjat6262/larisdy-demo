/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#111111",
          white: "#ffffff",
          gold: "#d4af37",
          brown: "#8a5a2b",
          copper: "#b87333",
          cream: "#f8f5ef",
          border: "#e5e0d6",
          muted: "#6b6b6b",
        },
      },
      boxShadow: {
        larisdy: "0 16px 40px rgba(17, 17, 17, 0.10)",
        "larisdy-sm": "0 8px 22px rgba(17, 17, 17, 0.08)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        ripple: {
          to: {
            opacity: "0",
            transform: "scale(4)",
          },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "fade-in-slow": "fadeIn 0.6s ease",
        ripple: "ripple 0.6s ease-out",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
