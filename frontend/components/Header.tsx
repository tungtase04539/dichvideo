"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Film, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
            </motion.div>
            <span className="font-display font-bold text-xl gradient-text">
              DichVideo
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-dark-300 hover:text-white transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              href="/projects"
              className="text-dark-300 hover:text-white transition-colors"
            >
              Dự án
            </Link>
            <Link href="/" className="btn-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tạo mới
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

