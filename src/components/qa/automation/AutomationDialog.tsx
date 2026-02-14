import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAutomation } from "@/hooks/useAutomation";

interface Props {
  scenarioId: string;
  scenarioName: string;
  loginTypes: string[];
}

export function AutomationDialog({ scenarioId, scenarioName, loginTypes }: Props) {
  const { triggerAutomation, triggering } = useAutomation();
  const [open, setOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleTrigger = async () => {
    if (!targetUrl) return;
    const result = await triggerAutomation(
      scenarioId,
      targetUrl,
      username && password ? { email: username, username, password } : undefined
    );
    if (result) {
      setOpen(false);
      setTargetUrl("");
      setUsername("");
      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
          <Zap className="h-4 w-4" />
          Automate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run Automated Test</DialogTitle>
          <DialogDescription>
            Configure and trigger automated browser testing for <strong>{scenarioName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-url">Target App URL *</Label>
            <Input
              id="target-url"
              placeholder="https://your-app.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use the root URL only — do not include path suffixes like /auth/admin</p>
          </div>

          <div className="space-y-2">
            <Label>Login Credentials ({loginTypes.join(", ")})</Label>
            <Input
              placeholder="Username / Email"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional: Credentials for the login type being tested</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> This prepares the test payload. You'll need a Playwright Runner service
              to execute the actual browser tests. The runner payload will be available for download.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleTrigger} disabled={triggering || !targetUrl}>
            {triggering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Prepare & Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
