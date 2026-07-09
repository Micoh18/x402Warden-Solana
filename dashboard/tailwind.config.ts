import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warden: {
          black: "#070A0E",
          ink: "#0B1118",
          panel: "#111A23",
          "panel-2": "#172330",
          body: "#111A23",
          "body-dark": "#070A0E",
          "body-light": "#172330",
          border: "#263442",
          text: "#F2F5F1",
          muted: "#A9B3AD",
          dim: "#68746F",
          lichen: "#B7F7D0",
          moss: "#A9B3AD",
          bone: "#D7C28A",
          "bone-dark": "#263442",
          soul: "#7CFFB2",
          "soul-light": "#B7F7D0",
          heart: "#63A8FF",
          deep: "#344657",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "fade-in": "fade-in-up 0.5s ease-out both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
