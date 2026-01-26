import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClearTestDataDialogProps {
  onComplete?: () => void;
}

export function ClearTestDataDialog({ onComplete }: ClearTestDataDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const CONFIRMATION_TEXT = "DELETE ALL";

  const handleClearData = async () => {
    if (confirmation !== CONFIRMATION_TEXT) {
      toast({
        variant: "destructive",
        title: "Confirmation Required",
        description: `Please type "${CONFIRMATION_TEXT}" to confirm.`,
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Delete in order: results -> runs -> steps -> cases -> scenarios
      // Using cascade, we need to delete in reverse dependency order
      
      const { error: resultsError } = await supabase
        .from("test_results")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (resultsError) throw resultsError;

      const { error: runsError } = await supabase
        .from("test_runs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (runsError) throw runsError;

      const { error: stepsError } = await supabase
        .from("test_steps")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (stepsError) throw stepsError;

      const { error: casesError } = await supabase
        .from("test_cases")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (casesError) throw casesError;

      const { error: scenariosError } = await supabase
        .from("test_scenarios")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (scenariosError) throw scenariosError;

      toast({
        title: "Data Cleared",
        description: "All test data has been successfully deleted.",
      });

      setOpen(false);
      setConfirmation("");
      onComplete?.();
    } catch (error: any) {
      console.error("Error clearing data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to clear test data.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="rounded-xl">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Test Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Clear All Test Data
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action will <strong>permanently delete</strong> all:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 bg-red-50 p-3 rounded-lg">
              <li>Test Scenarios</li>
              <li>Test Cases</li>
              <li>Test Steps</li>
              <li>Test Runs</li>
              <li>Test Results</li>
            </ul>
            <p className="text-red-600 font-medium">
              This action cannot be undone!
            </p>
            <div className="pt-2">
              <p className="text-sm mb-2">
                Type <strong>{CONFIRMATION_TEXT}</strong> to confirm:
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Type DELETE ALL"
                className="border-red-200 focus:border-red-400"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleClearData}
            disabled={isDeleting || confirmation !== CONFIRMATION_TEXT}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
