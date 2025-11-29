"use client";

import "./globals.css";
import { ReactNode } from "react";

const fontClass = "font-sans";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontClass} bg-slate-950 text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
