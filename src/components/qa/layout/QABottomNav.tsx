import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Bug,
  MoreHorizontal,
  AlertCircle,
  BarChart3,
  RotateCcw,
  Zap,
  BookOpen,
  LineChart,
  RefreshCw,
  LayoutDashboard,
  FileText,
  PlayCircle,
  ClipboardList,
  XCircle,
  Plus
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
    title: "Bugs",
    href: "/bugs",
    icon: Bug,
  },
  {
    title: "Cycles",
    href: "/qa/cycles",
    icon: RefreshCw,
  },
  {
    title: "Retest",
    href: "/bugs/retest",
    icon: RotateCcw,
  },
  {
    title: "Dashboard",
    href: "/qa",
    icon: LayoutDashboard,
    end: true,
  },
];

const moreNavItems = [
  {
    title: "Test Scenarios",
    href: "/qa/scenarios",
    icon: FileText,
    description: "Manage test scenarios",
  },
  {
    title: "Test Runs",
    href: "/qa/runs",
    icon: PlayCircle,
    description: "Manual test run execution",
  },
  {
    title: "Bug Report",
    href: "/bugs/report",
    icon: ClipboardList,
    description: "Comprehensive bug report view",
  },
  {
    title: "Closed Bugs",
    href: "/bugs/closed",
    icon: XCircle,
    description: "Previously resolved bugs",
  },
  {
    title: "Report Bug",
    href: "/bugs/create",
    icon: Plus,
    description: "Create a new bug report",
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
  {
    title: "Insights",
    href: "/qa/insights",
    icon: LineChart,
    description: "Bug resolution analytics & team effectiveness",
  },
  {
    title: "Cycle Insights",
    href: "/qa/cycle-insights",
    icon: BarChart3,
    description: "Cycle health, person-wise reports & trends",
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
    // Special handling: /bugs should not match /bugs/retest
    if (href === "/bugs") return location.pathname === "/bugs" || location.pathname.startsWith("/bugs/") && !location.pathname.startsWith("/bugs/retest") && !location.pathname.startsWith("/bugs/report") && !location.pathname.startsWith("/bugs/closed") && !location.pathname.startsWith("/bugs/create");
    return location.pathname.startsWith(href);
  };

  const isMoreActive = filteredMoreItems.some(item => isActive(item.href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-14 px-1">
        {mainNavItems.map((item) => {
          const active = isActive(item.href, item.end);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-0 flex-1 transition-all rounded-lg",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform shrink-0",
                active && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full",
                active && "text-primary"
              )}>
                {item.title}
              </span>
            </NavLink>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-0 flex-1 transition-all rounded-lg",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className={cn(
                "h-5 w-5 transition-transform shrink-0",
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
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 pb-4 overflow-y-auto">
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
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
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
