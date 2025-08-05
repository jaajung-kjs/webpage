/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // KEPCO 파란색 팔레트
        'kepco-blue': {
          50: 'hsl(214 100% 97%)',
          100: 'hsl(214 95% 93%)',
          200: 'hsl(213 97% 87%)',
          300: 'hsl(212 96% 78%)',
          400: 'hsl(213 94% 68%)',
          500: 'hsl(217 91% 60%)',
          600: 'hsl(221 83% 53%)',
          700: 'hsl(224 76% 48%)',
          800: 'hsl(226 71% 40%)',
          900: 'hsl(224 64% 33%)',
        },
        // KEPCO 브랜드 색상
        'kepco-primary': 'hsl(var(--kepco-primary))',
        'kepco-primary-dark': 'hsl(var(--kepco-primary-dark))',
        'kepco-primary-light': 'hsl(var(--kepco-primary-light))',
        'kepco-secondary': 'hsl(var(--kepco-secondary))',
        'kepco-secondary-dark': 'hsl(var(--kepco-secondary-dark))',
        'kepco-secondary-light': 'hsl(var(--kepco-secondary-light))',
        // 시맨틱 색상
        'kepco-success': 'hsl(var(--kepco-success))',
        'kepco-warning': 'hsl(var(--kepco-warning))',
        'kepco-error': 'hsl(var(--kepco-error))',
        'kepco-info': 'hsl(var(--kepco-info))',
        // 회색 계열
        'kepco-gray': {
          50: 'hsl(var(--kepco-gray-50))',
          100: 'hsl(var(--kepco-gray-100))',
          200: 'hsl(var(--kepco-gray-200))',
          300: 'hsl(var(--kepco-gray-300))',
          400: 'hsl(var(--kepco-gray-400))',
          500: 'hsl(var(--kepco-gray-500))',
          600: 'hsl(var(--kepco-gray-600))',
          700: 'hsl(var(--kepco-gray-700))',
          800: 'hsl(var(--kepco-gray-800))',
          900: 'hsl(var(--kepco-gray-900))',
          950: 'hsl(var(--kepco-gray-950))',
        },
        // 기존 테마 색상과의 호환성
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}