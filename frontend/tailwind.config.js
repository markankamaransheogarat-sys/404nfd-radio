/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#ff1a2f",
        panel: "#0a0a0a",
        dim: "#6b6b6b",
        line: "#232323",
        fg: "#e8e8e8",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Chakra Petch"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,26,47,0.4), 0 0 24px -4px rgba(255,26,47,0.55)",
        "glow-sm": "0 0 12px -2px rgba(255,26,47,0.5)",
      },
      keyframes: {
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        flicker: {
          "0%, 100%": { opacity: 1 },
          "92%": { opacity: 1 },
          "93%": { opacity: 0.4 },
          "94%": { opacity: 1 },
          "96%": { opacity: 0.6 },
          "97%": { opacity: 1 },
        },
        "fade-up": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.96)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "drift-glow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(40px, 25px) scale(1.15)" },
        },
      },
      animation: {
        eq1: "eq 0.9s ease-in-out infinite",
        eq2: "eq 1.2s ease-in-out infinite -0.4s",
        eq3: "eq 0.7s ease-in-out infinite -0.2s",
        flicker: "flicker 6s linear infinite",
        "fade-up": "fade-up 0.35s ease-out",
        "scale-in": "scale-in 0.18s ease-out",
        "spin-slow": "spin-slow 6s linear infinite",
        "drift-glow": "drift-glow 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
