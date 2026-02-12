import { useState } from "react";
import type { CreateTestCaseForm, CreateTestStepForm, LoginType } from "@/types/qa";

export interface TestCaseWithId extends CreateTestCaseForm {
  id?: string;
}

export function useTestCaseManager(initialLoginTypes: LoginType[] = []) {
  const [testCases, setTestCases] = useState<TestCaseWithId[]>([]);

  const addTestCase = (loginTypes: LoginType[]) => {
    setTestCases(prev => [...prev, {
      title: "",
      description: "",
      login_type: loginTypes[0] || "super_admin",
      preconditions: [],
      expected_result: "",
      content_types: [],
      is_regression: false,
      dependencies: [],
      steps: [{ action: "", expected_outcome: "" }],
    }]);
  };

  const updateTestCase = (index: number, updates: Partial<CreateTestCaseForm>) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === index ? { ...tc, ...updates } : tc
    ));
  };

  const removeTestCase = (index: number) => {
    setTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const addStep = (caseIndex: number) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === caseIndex
        ? { ...tc, steps: [...tc.steps, { action: "", expected_outcome: "" }] }
        : tc
    ));
  };

  const updateStep = (caseIndex: number, stepIndex: number, updates: Partial<CreateTestStepForm>) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === caseIndex
        ? {
            ...tc,
            steps: tc.steps.map((s, si) =>
              si === stepIndex ? { ...s, ...updates } : s
            )
          }
        : tc
    ));
  };

  const removeStep = (caseIndex: number, stepIndex: number) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === caseIndex
        ? { ...tc, steps: tc.steps.filter((_, si) => si !== stepIndex) }
        : tc
    ));
  };

  return {
    testCases,
    setTestCases,
    addTestCase,
    updateTestCase,
    removeTestCase,
    addStep,
    updateStep,
    removeStep,
  };
}
