import type { Metadata } from "next";
import {
  Montserrat,
  Outfit,
  Open_Sans,
  Manrope,
  Sanchez,
} from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/providers/StoreProvider";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { NavigationProvider } from "@/lib/providers/NavigationProvider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });
const geist = Manrope({
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Restaurant ERP System",
  description: "Comprehensive ERP system for restaurant management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased `}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <AuthProvider>
              <NavigationProvider>
                {children}
                <Toaster />
              </NavigationProvider>
            </AuthProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
