import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CasesListPage } from "./pages/CasesListPage";
import { NewCasePage } from "./pages/NewCasePage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { ContractsPage } from "./pages/ContractsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import { MFASetupPage } from "./pages/MFASetupPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/cases" element={<CasesListPage />} />
              <Route path="/cases/new" element={<NewCasePage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings/mfa" element={<MFASetupPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
