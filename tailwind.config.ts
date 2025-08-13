import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
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
        // Custom OccupEye color scheme
        primary: {
          DEFAULT: "#7B1E24",
          50: "#FDF2F3",
          100: "#FCE7E8",
          500: "#7B1E24",
          600: "#6B1A20",
          700: "#5B161C",
          800: "#4B1218",
          900: "#3B0E14",
        },
        secondary: {
          DEFAULT: "#FFD700",
          50: "#FFFEF0",
          100: "#FFFDE0",
          500: "#FFD700",
          600: "#E6C200",
          700: "#CCAD00",
          800: "#B39900",
          900: "#998400",
        },
        success: {
          DEFAULT: "#007A3D",
          50: "#F0F9F4",
          100: "#E0F2E9",
          500: "#007A3D",
          600: "#006B36",
          700: "#005C2F",
          800: "#004D28",
          900: "#003E21",
        },
        warning: {
          DEFAULT: "#FF4500",
          50: "#FFF4F0",
          100: "#FFE9E0",
          500: "#FF4500",
          600: "#E63E00",
          700: "#CC3700",
          800: "#B33000",
          900: "#992900",
        },
        background: "#FAF8F5",
        foreground: "#000000",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: {
          DEFAULT: "#FF4500",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#FFD700",
          foreground: "#000000",
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
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
