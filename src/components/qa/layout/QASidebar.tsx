import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  PlayCircle, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Bug
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QASidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/qa",
    icon: LayoutDashboard,
    end: true,
  },
  {
    title: "Test Scenarios",
    href: "/qa/scenarios",
    icon: FileText,
    subItems: [
      { title: "All Scenarios", href: "/qa/scenarios", icon: List },
      { title: "Create New", href: "/qa/scenarios/create", icon: Plus },
    ],
  },
  {
    title: "Test Runs",
    href: "/qa/runs",
    icon: PlayCircle,
    subItems: [
      { title: "All Runs", href: "/qa/runs", icon: List },
      { title: "Start Run", href: "/qa/runs/create", icon: Plus },
    ],
  },
  {
    title: "Coverage",
    href: "/qa/coverage",
    icon: BarChart3,
  },
  {
    title: "Bug Tracker",
    href: "/bugs",
    icon: Bug,
    subItems: [
      { title: "All Bugs", href: "/bugs", icon: List },
      { title: "Report Bug", href: "/bugs/create", icon: Plus },
    ],
  },
];

export function QASidebar({ collapsed, onCollapse }: QASidebarProps) {
  const location = useLocation();

  const isActive = (href: string, end?: boolean) => {
    if (end) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "bg-white/70 backdrop-blur-sm border-r border-orange-100/50 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.end);
          const Icon = item.icon;
          
          return (
            <div key={item.href}>
              <NavLink
                to={item.href}
                end={item.end}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-orange-50",
                  active && "bg-primary/10 text-primary font-medium"
                )}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary")} />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
              
              {/* Sub items - only show when expanded and has subItems */}
              {!collapsed && item.subItems && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const subActive = location.pathname === subItem.href;
                    const SubIcon = subItem.icon;
                    
                    return (
                      <NavLink
                        key={subItem.href}
                        to={subItem.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                          "hover:bg-orange-50 text-muted-foreground",
                          subActive && "bg-orange-100/50 text-primary font-medium"
                        )}
                      >
                        <SubIcon className="h-4 w-4" />
                        <span>{subItem.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Collapse Toggle */}
      <div className="p-3 border-t border-orange-100/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapse(!collapsed)}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
