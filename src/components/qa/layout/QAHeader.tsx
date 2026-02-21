import { Menu, LogOut, Settings, User, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProjectSelector } from "@/components/projects/ProjectSelector";

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-destructive/15 text-destructive border-destructive/30" },
  developer: { label: "Developer", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  user: { label: "QA Tester", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

interface QAHeaderProps {
  onMenuToggle: () => void;
  userName: string;
}

export function QAHeader({ onMenuToggle, userName }: QAHeaderProps) {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">QA</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-foreground text-sm">QA Testing</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">DonutAI Platform</p>
            </div>
          </div>
          
          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-border mx-1" />
          
          {/* Project Selector */}
          <ProjectSelector />
          
          {/* Health Map Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/qa/health-map")}
            className="text-xs h-8 gap-1.5"
          >
            <Map className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Health Map</span>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <div className="text-left">
                    <p className="text-sm font-medium">{userName}</p>
                  </div>
                )}
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${roleConfig[role || "user"]?.className || ""}`}>
                  {roleConfig[role || "user"]?.label || role}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
