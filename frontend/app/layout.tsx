import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DichVideo - AI Video Dubbing",
  description: "Multi-speaker video dubbing powered by AI. Translate and dub your videos with multiple voices automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Background effects */}
        <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[128px] pointer-events-none" />
        
        {/* Main content */}
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

