

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '380px',
        print: { raw: 'print' }
      },
      colors: {
        emerald: {
          DEFAULT: '#060D1F',
          deep: '#0F1D3C',
          mid: '#16284B',
          light: '#243A63',
          subtle: 'rgba(6, 13, 31, 0.06)',
          border: 'rgba(6, 13, 31, 0.16)'
        },
        gold: {
          DEFAULT: '#D4A843',
          soft: '#F7E09A',
          light: '#FBEBC1',
          deep: '#A77D20',
          subtle: 'rgba(212, 168, 67, 0.14)'
        },
        paper: {
          DEFAULT: '#F8FAFC',
          deep: '#EEF2F7',
          panel: '#FFFFFF',
          muted: '#E2E8F0'
        },
        ink: {
          DEFAULT: '#111827',
          soft: '#475569',
          muted: '#64748B',
          faint: 'rgba(15, 23, 42, 0.14)'
        },
        danger: {
          DEFAULT: '#A5291D',
          deep: '#7D1D13',
          bg: '#FBEAE7',
          border: 'rgba(165, 41, 29, 0.25)'
        },
        success: {
          DEFAULT: '#2F6B4F',
          deep: '#1E4D37',
          bg: '#E8F5EE',
          border: 'rgba(47, 107, 79, 0.25)'
        },
        warning: {
          DEFAULT: '#B86E00',
          deep: '#8A5200',
          bg: '#FFF4E0',
          border: 'rgba(184, 110, 0, 0.28)'
        },
        info: {
          DEFAULT: '#1D5B79',
          bg: '#E8F3F8',
          border: 'rgba(29, 91, 121, 0.25)'
        }
      },
      fontFamily: {
        serif: ['"Amiri"', '"Noto Serif Bengali"', 'serif'],
        bengali: ['"Noto Serif Bengali"', 'serif'],
        sans: ['"Inter"', '"Noto Serif Bengali"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        ledger: '0 20px 50px -20px rgba(8, 43, 33, 0.35)',
        card: '0 8px 24px -8px rgba(8, 43, 33, 0.12)',
        'card-hover': '0 14px 32px -10px rgba(8, 43, 33, 0.22)',
        'gold-glow': '0 0 0 4px rgba(198, 156, 61, 0.20)',
        'emerald-glow': '0 10px 24px -10px rgba(14, 59, 46, 0.60)',
        'inner-subtle': 'inset 0 2px 4px 0 rgba(27, 36, 32, 0.05)'
      },
      borderRadius: {
        ledger: '16px',
        card: '12px'
      },
      keyframes: {
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shake: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' }
        },
        sealIn: {
          '0%': { opacity: '0', transform: 'scale(0.4) rotate(-25deg)' },
          '60%': { opacity: '1', transform: 'scale(1.08) rotate(4deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'fade-down': 'fadeDown 0.6s ease forwards',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pop-in': 'popIn 0.35s ease forwards',
        shake: 'shake 0.4s ease',
        'seal-in': 'sealIn 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.3) both',
        shimmer: 'shimmer 1.8s infinite linear'
      }
    }
  },
  plugins: [],
}
