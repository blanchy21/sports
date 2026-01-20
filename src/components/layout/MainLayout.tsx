"use client";

import React from "react";
import { TopNavigation } from "./TopNavigation";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showRightSidebar?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className, showRightSidebar = true }) => {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className={cn("lg:pl-64 xl:pl-80", showRightSidebar && "xl:pr-80 2xl:pr-[28rem]")}>
        <main className={cn("max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6", className)}>
          {children}
        </main>
      </div>
      <Sidebar />
      {showRightSidebar && <RightSidebar />}
    </div>
  );
};
