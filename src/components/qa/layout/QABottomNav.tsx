import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  PlayCircle, 
  Bug,
  MoreHorizontal,
  AlertCircle,
  BarChart3,
  RotateCcw,
  Zap,
  X,
  BookOpen,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/qa",
    icon: LayoutDashboard,
    end: true,
  },
  {
    title: "Scenarios",
    href: "/qa/scenarios",
    icon: FileText,
  },
  {
    title: "Runs",
    href: "/qa/runs",
    icon: PlayCircle,
  },
];

const moreNavItems = [
  {
    title: "Bugs",
    href: "/bugs",
    icon: Bug,
    description: "View and manage bugs",
  },
  {
    title: "Pending Retest",
    href: "/bugs/retest",
    icon: RotateCcw,
    description: "Bugs awaiting QA verification",
  },
  {
    title: "Bug Report",
    href: "/bugs/report",
    icon: Bug,
    description: "Comprehensive bug report view",
  },
  {
    title: "Failures",
    href: "/qa/failures",
    icon: AlertCircle,
    description: "Pending test failures",
  },
  {
    title: "Automation",
    href: "/qa/automation",
    icon: Zap,
    description: "Automated browser testing",
  },
  {
    title: "Auto Test Runs",
    href: "/qa/automation/runs",
    icon: PlayCircle,
    description: "Automated test run results",
  },
  {
    title: "Automation Bugs",
    href: "/qa/automation/bugs",
    icon: Bug,
    description: "Failures from automated tests",
  },
  {
    title: "Coverage",
    href: "/qa/coverage",
    icon: BarChart3,
    description: "Test coverage analytics",
  },
];

export function QABottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const automationEnabled = profile?.automation_enabled === true;
  const docsEnabled = profile?.docs_enabled === true;
  
  const filteredMoreItems = [
    ...moreNavItems.filter(item => 
      !["Automation", "Automation Bugs", "Auto Test Runs"].includes(item.title) || automationEnabled
    ),
    ...(docsEnabled ? [{
      title: "Developer Docs",
      href: "/qa/docs/developer",
      icon: BookOpen,
      description: "Integration guide & API reference",
    }] : []),
  ];

  const isActive = (href: string, end?: boolean) => {
    if (end) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  // Check if any "more" item is active
  const isMoreActive = filteredMoreItems.some(item => isActive(item.href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {mainNavItems.map((item) => {
          const active = isActive(item.href, item.end);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[60px] transition-all rounded-lg",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                active && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                active && "text-primary"
              )}>
                {item.title}
              </span>
            </NavLink>
          );
        })}

        {/* More Button with Sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[60px] transition-all rounded-lg",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className={cn(
                "h-5 w-5 transition-transform",
                isMoreActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isMoreActive && "text-primary"
              )}>
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 pb-4">
              {filteredMoreItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      active 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      active ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
