import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitácora",
  description: "Tu agenda personal de tareas y recordatorios",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bitácora",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfbf7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // En desarrollo desregistramos SW para evitar problemas con HMR
              if (window.location.hostname === 'localhost' && navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                });
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = localStorage.getItem('font-size');
                if (s === 'small') document.documentElement.classList.add('text-sm');
                else if (s === 'large') document.documentElement.classList.add('text-lg');
                else document.documentElement.classList.add('text-base');
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var bg = localStorage.getItem('bg-image');
                  if (bg) document.body.style.setProperty('--bg-custom', 'url(' + bg + ')');
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
