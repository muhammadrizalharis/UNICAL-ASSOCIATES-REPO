import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://unical.unismuh.ac.id",
  ),
  title: {
    default: "UNICAL ASSOCIATES REPO",
    template: "%s",
  },
  description:
    "Repositori publikasi ilmiah Universitas Muhammadiyah Makassar.",
  openGraph: {
    siteName: "UNICAL ASSOCIATES REPO",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Terapkan tema sebelum render pertama agar tidak berkedip. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("unical.theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
