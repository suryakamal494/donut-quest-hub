import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AutomationGuard } from "@/components/auth/AutomationGuard";
import { Loader2 } from "lucide-react";

// Eager: auth/landing pages (small, always needed)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Eager: layout shell (needed for all protected routes)
import { QALayout } from "@/components/qa/layout";

// Lazy: all feature pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const QADashboard = lazy(() => import("./pages/qa/QADashboard"));
const TestScenarios = lazy(() => import("./pages/qa/TestScenarios"));
const CreateScenario = lazy(() => import("./pages/qa/CreateScenario"));
const ScenarioDetail = lazy(() => import("./pages/qa/ScenarioDetail"));
const EditScenario = lazy(() => import("./pages/qa/EditScenario"));
const TestRuns = lazy(() => import("./pages/qa/TestRuns"));
const CreateTestRun = lazy(() => import("./pages/qa/CreateTestRun"));
const TestCaseHistory = lazy(() => import("./pages/qa/TestCaseHistory"));
const ExecuteTestRun = lazy(() => import("./pages/qa/ExecuteTestRun"));
const Failures = lazy(() => import("./pages/qa/Failures"));
const Coverage = lazy(() => import("./pages/qa/Coverage"));
const AutomationDashboard = lazy(() => import("./pages/qa/AutomationDashboard"));
const AutomationBugs = lazy(() => import("./pages/qa/AutomationBugs"));
const AutomationTestRuns = lazy(() => import("./pages/qa/AutomationTestRuns"));
const HealthMap = lazy(() => import("./pages/qa/HealthMap"));
const DeveloperDocs = lazy(() => import("./pages/docs/DeveloperDocs"));
const BugList = lazy(() => import("./pages/bugs/BugList"));
const CreateBug = lazy(() => import("./pages/bugs/CreateBug"));
const BugDetail = lazy(() => import("./pages/bugs/BugDetail"));
const EditBug = lazy(() => import("./pages/bugs/EditBug"));
const ClosedBugs = lazy(() => import("./pages/bugs/ClosedBugs"));
const BugReport = lazy(() => import("./pages/bugs/BugReport"));
const PendingRetest = lazy(() => import("./pages/bugs/PendingRetest"));
const ApiKeyManager = lazy(() => import("./pages/admin/ApiKeyManager"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProjectProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              {/* /dashboard redirects to /qa */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <QALayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<QADashboard />} />
              </Route>
              
              {/* QA Module Routes */}
              <Route
                path="/qa"
                element={
                  <ProtectedRoute>
                    <QALayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<QADashboard />} />
                <Route path="scenarios" element={<TestScenarios />} />
                <Route path="scenarios/create" element={<CreateScenario />} />
                <Route path="scenarios/:id" element={<ScenarioDetail />} />
                <Route path="scenarios/:id/edit" element={<EditScenario />} />
                <Route path="test-cases/:id/history" element={<TestCaseHistory />} />
                <Route path="runs" element={<TestRuns />} />
                <Route path="runs/create" element={<CreateTestRun />} />
                <Route path="runs/:id" element={<ScenarioDetail />} />
                <Route path="runs/:id/execute" element={<ExecuteTestRun />} />
                <Route path="failures" element={<Failures />} />
                <Route path="automation" element={<AutomationGuard><AutomationDashboard /></AutomationGuard>} />
                <Route path="automation/bugs" element={<AutomationGuard><AutomationBugs /></AutomationGuard>} />
                <Route path="automation/runs" element={<AutomationGuard><AutomationTestRuns /></AutomationGuard>} />
                <Route path="coverage" element={<Coverage />} />
                <Route path="health-map" element={<HealthMap />} />
                <Route path="docs/developer" element={<DeveloperDocs />} />
              </Route>

              {/* Bug Tracking Routes */}
              <Route
                path="/bugs"
                element={
                  <ProtectedRoute>
                    <QALayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<BugList />} />
                <Route path="retest" element={<PendingRetest />} />
                <Route path="closed" element={<ClosedBugs />} />
                <Route path="report" element={<BugReport />} />
                <Route path="create" element={<CreateBug />} />
                <Route path=":id" element={<BugDetail />} />
                <Route path=":id/edit" element={<EditBug />} />
                <Route path="api-keys" element={<ApiKeyManager />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;