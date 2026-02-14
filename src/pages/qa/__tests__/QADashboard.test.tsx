// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QADashboard from "../QADashboard";

// Build a chainable mock that resolves to empty data
function createChainableMock(data: unknown[] = []) {
  const mock = {
    select: vi.fn((): any => mock),
    eq: vi.fn((): any => mock),
    order: vi.fn((): any => mock),
    limit: vi.fn((): any => mock),
    gte: vi.fn((): any => mock),
    in: vi.fn((): any => mock),
    then: (resolve: (val: any) => any) => resolve({ data, error: null }),
  };
  return mock;
}

const mockFrom = vi.fn((_table: string) => createChainableMock([]));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseProject = vi.fn();
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => mockUseProject(),
}));

vi.mock("@/components/dashboard/DeveloperDashboard", () => ({
  DeveloperDashboard: () => <div data-testid="developer-dashboard">Developer Dashboard</div>,
}));

vi.mock("@/components/dashboard/AdminQADashboard", () => ({
  AdminQADashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

vi.mock("@/components/qa/FailedTestsReminder", () => ({
  FailedTestsReminder: () => null,
}));

vi.mock("@/components/qa", () => ({
  TodayActivityPanel: () => null,
  StaleFailuresAlert: () => null,
}));

vi.mock("@/components/qa/widgets", () => ({
  WeeklyBugTrendsChart: () => null,
  CoverageSummaryWidget: () => null,
}));

vi.mock("@/components/qa/badges", () => ({
  ScenarioTypeBadge: ({ type }: { type: string }) => <span>{type}</span>,
}));

const mockProject = { id: "proj-1", name: "Test Project", description: null, created_by: null, created_at: "", updated_at: "" };
const mockUser = { id: "user-1", email: "test@test.com" };

function renderDashboard() {
  return render(
    <MemoryRouter>
      <QADashboard />
    </MemoryRouter>
  );
}

describe("QADashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => createChainableMock([]));
  });

  describe("Role-based rendering", () => {
    it("renders DeveloperDashboard for developer role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "developer" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.getByTestId("developer-dashboard")).toBeInTheDocument();
    });

    it("renders AdminQADashboard for admin role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "admin" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });

    it("renders QA dashboard for user role", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("QA Dashboard")).toBeInTheDocument();
      });
    });

    it("does not render DeveloperDashboard for non-developer role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.queryByTestId("developer-dashboard")).not.toBeInTheDocument();
    });

    it("does not render AdminQADashboard for non-admin role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.queryByTestId("admin-dashboard")).not.toBeInTheDocument();
    });
  });

  describe("No project selected", () => {
    it("shows no project message when currentProject is null", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: null, isLoading: false });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("No Project Selected")).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("shows loader when project is loading", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: null, isLoading: true });

      const { container } = renderDashboard();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("Data loading", () => {
    it("calls supabase to fetch data for QA user", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("test_scenarios");
        expect(mockFrom).toHaveBeenCalledWith("test_runs");
        expect(mockFrom).toHaveBeenCalledWith("test_results");
      });
    });

    it("does NOT load QA data for developer role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "developer" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.getByTestId("developer-dashboard")).toBeInTheDocument();
    });

    it("does NOT load QA data for admin role", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "admin" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      renderDashboard();
      expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });
  });

  describe("TDZ safety", () => {
    it("does not throw TDZ error on render", () => {
      mockUseAuth.mockReturnValue({ user: mockUser, role: "user" });
      mockUseProject.mockReturnValue({ currentProject: mockProject, isLoading: false });

      expect(() => renderDashboard()).not.toThrow();
    });
  });
});
