import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stock Portfolio Intelligence Dashboard",
  description: "Next-gen stock market intelligence console with custom metric screeners, technical analysis charts, user watchlist, and persistent portfolio trackers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var handleErr = function(e) {
                  var msg = e && e.message ? String(e.message) : "";
                  if (
                    msg.includes("Script error") ||
                    msg.includes("ResizeObserver") ||
                    msg.includes("loop limit exceeded")
                  ) {
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    if (e.preventDefault) e.preventDefault();
                    return true;
                  }
                };
                window.addEventListener("error", handleErr, true);
                window.addEventListener("unhandledrejection", function(e) {
                  var reason = e && e.reason;
                  var msg = reason ? String(reason.message || reason) : "";
                  if (
                    msg.includes("Script error") ||
                    msg.includes("ResizeObserver") ||
                    msg.includes("loop limit exceeded")
                  ) {
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    if (e.preventDefault) e.preventDefault();
                  }
                }, true);
              })();
            `
          }}
        />
      </head>
      <body className="antialiased bg-[#030303] text-[#f1f5f9] min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
