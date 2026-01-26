import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  PlayCircle, 
  BarChart3,
  Bug 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
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
  {
    title: "Bugs",
    href: "/bugs",
    icon: Bug,
  },
];

export function QABottomNav() {
  const location = useLocation();

  const isActive = (href: string, end?: boolean) => {
    if (end) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-orange-100 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href, item.end);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-all",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                active && "scale-110"
              )} />
              <span className={cn(
                "text-xs font-medium",
                active && "text-primary"
              )}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
