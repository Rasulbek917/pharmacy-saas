"use client";

import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TrialWarningBanner from "../common/TrialWarningBanner";
import { AuthUser } from "@/types";

export default function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pb-20 md:pb-8 min-w-0 overflow-hidden">
        <Navbar
          user={user}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic warning banner if trial or subscription is expiring */}
        <TrialWarningBanner user={user} />

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav user={user} />
      </div>
    </div>
  );
}
