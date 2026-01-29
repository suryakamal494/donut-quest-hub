import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import AccessDenied from "./pages/AccessDenied";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";

// QA Module
import { QALayout } from "@/components/qa/layout";
import { QADashboard, TestScenarios, TestRuns, Coverage } from "./pages/qa";
import CreateScenario from "./pages/qa/CreateScenario";
import ScenarioDetail from "./pages/qa/ScenarioDetail";
import EditScenario from "./pages/qa/EditScenario";
import CreateTestRun from "./pages/qa/CreateTestRun";
import TestCaseHistory from "./pages/qa/TestCaseHistory";
import ExecuteTestRun from "./pages/qa/ExecuteTestRun";

// Bug Module
import { BugList, CreateBug, BugDetail } from "./pages/bugs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProjectProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            
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
              <Route path="coverage" element={<Coverage />} />
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
              <Route path="create" element={<CreateBug />} />
              <Route path=":id" element={<BugDetail />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
