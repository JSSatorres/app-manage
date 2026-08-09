import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Roboto_Condensed } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { QueryProvider } from "@/providers/query-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const robotoCondensed = Roboto_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
})

const APP_NAME = "Manage Sport App"
const APP_DEFAULT_TITLE = "Manage Sport App"
const APP_TITLE_TEMPLATE = "%s | Manage Sport App"
const APP_DESCRIPTION = "Aplicación de gestión deportiva"

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: "#1b1b19",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${robotoCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div
          hidden
          data-impeccable-contract="THESIS OWN-WORLD STORY FIRST-VIEWPORT FORM FINISH"
        >
          {`THESIS: La gestión diaria del club se presenta con la urgencia y claridad de una mesa de banquillo.
OWN-WORLD: Banquillo editorial combina papel, tinta, reglas y coral para ordenar la operación deportiva.
STORY: Cada sesión importante se lee como el siguiente momento de partido que el equipo debe preparar.
FIRST VIEWPORT: Un rail de tinta encuadra el espacio de trabajo sobre papel y concentra la mirada en la jornada.
FORM: Dirección Banquillo editorial fijada por la persona usuaria; sin seed aleatoria.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`}
        </div>
        <QueryProvider>{children}</QueryProvider>
        <Analytics />
        <footer />
      </body>
    </html>
  )
}
