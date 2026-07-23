import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "The Communication Mirror", template: "%s Â· The Communication Mirror" },
  description: "A private, on-device practice room for seeing how you communicate.",
  applicationName: "Communication Mirror",
  appleWebApp: { capable: true, title: "Mirror", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#171611", colorScheme: "dark" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
