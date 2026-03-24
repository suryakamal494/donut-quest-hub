import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { QASidebar } from "./QASidebar";
import { QABottomNav } from "./QABottomNav";
import { QAHeader } from "./QAHeader";
import { useIsMobile } from "@/hooks/use-mobile";

export function QALayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      {/* Header - always visible */}
      <QAHeader 
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={profile?.full_name || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <QASidebar 
            collapsed={sidebarCollapsed} 
            onCollapse={setSidebarCollapsed}
          />
        )}
        
        {/* Main Content */}
        <main className={`
          flex-1 overflow-y-auto
          ${isMobile ? 'pb-20' : ''}
        `}>
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <QABottomNav />}
    </div>
  );
}
