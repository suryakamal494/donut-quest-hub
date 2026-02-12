// Export utilities for QA data

export function exportToCSV(data: Record<string, any>[], filename: string, columns?: { key: string; label: string }[]) {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);
  const headers = columns ? columns.map(c => c.label) : keys;

  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key];
        if (value === null || value === undefined) return "";
        if (Array.isArray(value)) return `"${value.join("; ")}"`;
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportScenariosToCSV(scenarios: any[]) {
  const columns = [
    { key: "scenario_code", label: "Scenario Code" },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "scenario_type", label: "Type" },
    { key: "login_types", label: "Login Types" },
    { key: "priority", label: "Priority" },
    { key: "test_frequency", label: "Frequency" },
    { key: "business_impact", label: "Business Impact" },
    { key: "created_at", label: "Created At" },
  ];

  const data = scenarios.map(s => ({
    ...s,
    login_types: s.login_types?.join(", ") || "",
    created_at: new Date(s.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `test-scenarios-${formatDate(new Date())}`, columns);
}

export function exportTestCasesToCSV(testCases: any[]) {
  const columns = [
    { key: "case_code", label: "Case Code" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "login_type", label: "Login Type" },
    { key: "preconditions", label: "Preconditions" },
    { key: "expected_result", label: "Expected Result" },
    { key: "is_regression", label: "Is Regression" },
    { key: "created_at", label: "Created At" },
  ];

  const data = testCases.map(tc => ({
    ...tc,
    preconditions: tc.preconditions?.join("; ") || "",
    is_regression: tc.is_regression ? "Yes" : "No",
    created_at: new Date(tc.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `test-cases-${formatDate(new Date())}`, columns);
}

export function exportTestResultsToCSV(results: any[]) {
  const columns = [
    { key: "case_code", label: "Case Code" },
    { key: "title", label: "Test Case" },
    { key: "status", label: "Status" },
    { key: "actual_result", label: "Actual Result" },
    { key: "notes", label: "Notes" },
    { key: "bug_reference", label: "Bug Reference" },
    { key: "executed_at", label: "Executed At" },
  ];

  const data = results.map(r => ({
    case_code: r.test_case?.case_code || "",
    title: r.test_case?.title || "",
    status: r.status,
    actual_result: r.actual_result || "",
    notes: r.notes || "",
    bug_reference: r.bug_reference || "",
    executed_at: r.executed_at ? new Date(r.executed_at).toLocaleString() : "",
  }));

  exportToCSV(data, `test-results-${formatDate(new Date())}`, columns);
}

export function exportBugsToCSV(bugs: any[]) {
  const columns = [
    { key: "bug_code", label: "Bug ID" },
    { key: "title", label: "Title" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
    { key: "bug_type", label: "Bug Type" },
    { key: "login_type", label: "Login Type" },
    { key: "description", label: "Description" },
    { key: "steps_to_reproduce", label: "Steps to Reproduce" },
    { key: "expected_behavior", label: "Expected Behavior" },
    { key: "actual_behavior", label: "Actual Behavior" },
    { key: "environment", label: "Environment" },
    { key: "sub_module", label: "Sub-module" },
    { key: "created_at", label: "Reported On" },
  ];

  const data = bugs.map(b => ({
    ...b,
    steps_to_reproduce: b.steps_to_reproduce?.join("; ") || "",
    bug_type: b.bug_type || "",
    login_type: b.login_type || "",
    sub_module: b.sub_module || "",
    created_at: new Date(b.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `bugs-${formatDate(new Date())}`, columns);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
