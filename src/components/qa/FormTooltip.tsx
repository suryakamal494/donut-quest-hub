import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}

export function FormTooltip({ label, tooltip, required, className, htmlFor }: FormTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Label htmlFor={htmlFor} className={cn("flex items-center gap-1.5 cursor-help", className)}>
            {label}{required && " *"}
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </Label>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs z-[100]">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tooltip content definitions for consistency across Create and Edit forms
export const FIELD_TOOLTIPS = {
  // Step 1 - Classification
  scenarioType: "Smoke: Single page tests. Intra-Login: Multi-module tests within one role. Inter-Login: Tests across different user roles.",
  loginTypes: "Select all user roles involved in this test. Features will be filtered to match these roles.",
  feature: "The LMS module being tested. Only features matching your selected login types are shown.",
  subModule: "The specific section within the feature. E.g., 'Chapter Management' under Content Library.",
  testFrequency: "One-time: Run once. Regression: Run regularly after changes. Release: Run before each release.",
  priority: "Critical: System-breaking if fails. High: Major feature impact. Medium: Normal priority. Low: Minor impact.",
  
  // Step 2 - Details
  scenarioName: "A descriptive name like 'Content Library - Global Content Propagation Test'",
  description: "Explain what this scenario validates and why it's important",
  businessImpact: "What could go wrong if this test fails? E.g., 'Students unable to view assigned content'",
  
  // Step 3 - Test Cases
  testCaseTitle: "Short name describing what this specific test validates",
  testCaseLoginType: "Which user role executes this test case",
  expectedResult: "The successful outcome when all steps pass",
  stepAction: "What the tester should do. E.g., 'Click on Chapter 1'",
  stepExpectedOutcome: "What should happen after the action. E.g., 'Chapter content displays'",
  
  // Test Run
  runName: "Optional custom name for this test run. Helps identify the purpose of this execution.",
  selectScenarios: "Choose which test scenarios to include in this run. All test cases from selected scenarios will be executed.",
};

// Placeholder text for consistency
export const FIELD_PLACEHOLDERS = {
  scenarioName: "e.g., Content Library - Global Content Propagation",
  description: "Describe what this scenario validates and why it matters...",
  businessImpact: "What could go wrong if this test fails? What's the user impact?",
  testCaseTitle: "e.g., Verify teacher can upload content",
  expectedResult: "e.g., Content appears in student's library within 5 seconds",
  stepAction: "e.g., Navigate to Content Library > Upload",
  stepExpectedOutcome: "e.g., Upload success message appears",
  actualResult: "Describe what actually happened if different from expected...",
  notes: "Additional observations, environment details, or reproduction steps...",
};
