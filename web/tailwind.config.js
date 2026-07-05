/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        // "Quest HUD" semantic colors
        stage: "hsl(var(--stage))",
        cyan: "hsl(var(--cyan))",
        cyanGlow: "hsl(var(--cyan-glow))",
        gold: "hsl(var(--gold))",
        goldGlow: "hsl(var(--gold-glow))",
        violet: "hsl(var(--violet))",
        violetGlow: "hsl(var(--violet-glow))",
        pink: "hsl(var(--pink))",
        green: "hsl(var(--green))",
        red: "hsl(var(--red))",
        cream: "hsl(var(--cream))",
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
        // CWABS family accent colors
        cwabsC: "hsl(var(--cwabs-c))",
        cwabsW: "hsl(var(--cwabs-w))",
        cwabsA: "hsl(var(--cwabs-a))",
        cwabsB: "hsl(var(--cwabs-b))",
        cwabsS: "hsl(var(--cwabs-s))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ['"Anton"', '"Sora"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.85)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "correct-flash": {
          "0%": { backgroundColor: "hsl(var(--success) / 0)" },
          "50%": { backgroundColor: "hsl(var(--success) / 0.4)" },
          "100%": { backgroundColor: "hsl(var(--success) / 0)" },
        },
        "wrong-flash": {
          "0%": { backgroundColor: "hsl(var(--danger) / 0)" },
          "50%": { backgroundColor: "hsl(var(--danger) / 0.4)" },
          "100%": { backgroundColor: "hsl(var(--danger) / 0)" },
        },
        marquee: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "60px 0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "letter-fly": {
          "0%": { opacity: "0", transform: "translate3d(0,0,-1200px) rotateX(-540deg) rotateY(-360deg) scale(0.2)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0) rotateX(0) rotateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pop-in": "pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "score-pop": "score-pop 0.4s ease-out",
        "correct-flash": "correct-flash 0.6s ease-out",
        "wrong-flash": "wrong-flash 0.6s ease-out",
        marquee: "marquee 3s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "letter-fly": "letter-fly 0.9s cubic-bezier(0.18, 0.9, 0.4, 1.1) forwards",
      },
      boxShadow: {
        "gold-glow": "0 0 30px hsl(var(--gold-glow) / 0.5)",
        "gold-glow-lg": "0 0 60px hsl(var(--gold-glow) / 0.6)",
        "cyan-glow": "0 0 28px hsl(var(--cyan) / 0.5)",
        "cyan-glow-sm": "0 0 12px hsl(var(--cyan) / 0.4)",
        "cyan-glow-lg": "0 0 48px hsl(var(--cyan) / 0.6)",
        "violet-glow": "0 0 24px hsl(var(--violet) / 0.45)",
        stage: "inset 0 -100px 100px -50px hsl(var(--cyan) / 0.1)",
        "btn-cyan": "0 6px 24px hsl(var(--cyan) / 0.35), inset 0 1px 0 hsl(var(--cyan-glow) / 0.4)",
        "btn-gold": "0 6px 24px hsl(var(--gold) / 0.4), inset 0 1px 0 hsl(var(--gold-glow) / 0.5)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};