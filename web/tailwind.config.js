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
        // Game-show custom colors
        stage: "hsl(var(--stage))",
        spotlight: "hsl(var(--spotlight))",
        gold: "hsl(var(--gold))",
        goldGlow: "hsl(var(--gold-glow))",
        velvet: "hsl(var(--velvet))",
        cream: "hsl(var(--cream))",
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ['"Bowlby One"', "system-ui", "sans-serif"],
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
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "spotlight-sweep": {
          "0%, 100%": { opacity: "0.4", transform: "translateX(-30%)" },
          "50%": { opacity: "0.7", transform: "translateX(30%)" },
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pop-in": "pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "score-pop": "score-pop 0.4s ease-out",
        "spotlight-sweep": "spotlight-sweep 8s ease-in-out infinite",
        "correct-flash": "correct-flash 0.6s ease-out",
        "wrong-flash": "wrong-flash 0.6s ease-out",
        marquee: "marquee 3s linear infinite",
      },
      backgroundImage: {
        "stage-radial":
          "radial-gradient(ellipse at top, hsl(var(--spotlight)) 0%, transparent 60%)",
        "stage-velvet":
          "radial-gradient(ellipse at center, hsl(var(--velvet) / 0.4) 0%, hsl(var(--stage)) 70%)",
        "marquee-lights":
          "radial-gradient(circle, hsl(var(--gold)) 2px, transparent 2.5px)",
      },
      boxShadow: {
        "gold-glow": "0 0 30px hsl(var(--gold-glow) / 0.5)",
        "gold-glow-lg": "0 0 60px hsl(var(--gold-glow) / 0.6)",
        "stage": "inset 0 -100px 100px -50px hsl(var(--velvet) / 0.5)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};