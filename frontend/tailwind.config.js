/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#f8fafc',
          surface: '#ffffff',
          card: '#ffffff',
          border: '#e2e8f0',
          accent: '#ea580c',      // vibrant fitness orange
          accentHover: '#c2410c',
          gold: '#d97706',        // gold highlight
          emerald: '#059669',     // active green
          rose: '#e11d48',        // expired red
          cyan: '#0891b2',        // info cyan
          indigo: '#4f46e5',
          muted: '#64748b',
          text: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'glow-orange': '0 4px 20px -2px rgba(234, 88, 12, 0.25)',
      }
    },
  },
  plugins: [],
}
