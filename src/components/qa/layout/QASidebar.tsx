import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  PlayCircle, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  List,
  Bug,
  AlertTriangle,
  XCircle,
  ClipboardList,
  RotateCcw,
  Zap,
  BookOpen,
  LineChart,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    title: "Bug Tracker",
    href: "/bugs",
    icon: Bug,
    subItems: [
      { title: "Bug Report", href: "/bugs/report", icon: ClipboardList },
      { title: "Active Bugs", href: "/bugs", icon: List },
      { title: "Pending Retest", href: "/bugs/retest", icon: RotateCcw },
      { title: "Closed Bugs", href: "/bugs/closed", icon: XCircle },
      { title: "Report Bug", href: "/bugs/create", icon: Plus },
    ],
  },
  {
    title: "Test Cycles",
    href: "/qa/cycles",
    icon: RefreshCw,
  },
  {
    title: "Test Scenarios",
    href: "/qa/scenarios",
    icon: FileText,
    collapsible: true,
    subItems: [
      { title: "All Scenarios", href: "/qa/scenarios", icon: List },
      { title: "Create Scenario", href: "/qa/scenarios/create", icon: Plus },
      { title: "All Runs", href: "/qa/runs", icon: PlayCircle },
      { title: "Start Run", href: "/qa/runs/create", icon: Plus },
      { title: "Failures", href: "/qa/failures", icon: AlertTriangle },
    ],
  },
  {
    title: "Automation",
    href: "/qa/automation",
    icon: Zap,
    subItems: [
      { title: "Runs", href: "/qa/automation", icon: Zap },
      { title: "Test Runs", href: "/qa/automation/runs", icon: PlayCircle },
      { title: "Automation Bugs", href: "/qa/automation/bugs", icon: Bug },
    ],
  },
  {
    title: "Coverage",
    href: "/qa/coverage",
    icon: BarChart3,
  },
  {
    title: "Insights",
    href: "/qa/insights",
    icon: LineChart,
  },
];

export function QASidebar({ collapsed, onCollapse }: QASidebarProps) {
  const location = useLocation();
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const [retestCount, setRetestCount] = useState(0);
  const [scenariosExpanded, setScenariosExpanded] = useState(true);
  
  const automationEnabled = profile?.automation_enabled === true;
  const docsEnabled = profile?.docs_enabled === true;

  useEffect(() => {
    if (currentProject) {
      supabase
        .from("bugs")
        .select("id", { count: "exact", head: true })
        .eq("project_id", currentProject.id)
        .eq("fix_status", "fixed")
        .eq("status", "resolved")
        .then(({ count }) => setRetestCount(count || 0));
    }
  }, [currentProject, location.pathname]);

  // Auto-expand scenarios section if a child route is active
  useEffect(() => {
    const scenarioItem = navItems.find(i => i.collapsible);
    if (scenarioItem?.subItems?.some(s => location.pathname === s.href || location.pathname.startsWith(s.href + "/"))) {
      setScenariosExpanded(true);
    }
  }, [location.pathname]);

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
      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(item => item.title !== "Automation" || automationEnabled).map((item) => {
          const active = isActive(item.href, item.end);
          const Icon = item.icon;
          const isCollapsible = (item as any).collapsible;
          
          return (
            <div key={item.title}>
              <div className="flex items-center">
                <NavLink
                  to={item.href}
                  end={item.end}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all flex-1",
                    "hover:bg-orange-50",
                    active && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary")} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
                {/* Collapse toggle for Test Scenarios */}
                {!collapsed && isCollapsible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      setScenariosExpanded(!scenariosExpanded);
                    }}
                  >
                    {scenariosExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              
              {/* Sub items */}
              {!collapsed && item.subItems && (!isCollapsible || scenariosExpanded) && (
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
                        <span className="flex-1">{subItem.title}</span>
                        {subItem.title === "Pending Retest" && retestCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                            {retestCount}
                          </Badge>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {docsEnabled && (
          <div>
            <NavLink
              to="/qa/docs/developer"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-orange-50",
                isActive("/qa/docs/developer") && "bg-primary/10 text-primary font-medium"
              )}
            >
              <BookOpen className={cn("h-5 w-5 flex-shrink-0", isActive("/qa/docs/developer") && "text-primary")} />
              {!collapsed && <span>Developer Docs</span>}
            </NavLink>
          </div>
        )}
      </nav>
      
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
