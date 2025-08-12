import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/Login/LoginForm";
import StudentDashboard from "./components/Dashboard/StudentDashboard";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import MaintenanceDashboard from "./components/Dashboard/MaintenanceDashboard";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Header from "./components/Navigation/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Header />}
      {children}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login/student" replace />} />
              
              {/* Login routes */}
              <Route path="/login/student" element={<LoginForm role="student" />} />
              <Route path="/login/admin" element={<LoginForm role="admin" />} />
              <Route path="/login/maintenance" element={<LoginForm role="maintenance" />} />
              
              {/* Protected dashboard routes */}
              <Route 
                path="/student" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/maintenance" 
                element={
                  <ProtectedRoute allowedRoles={['maintenance']}>
                    <MaintenanceDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/login/student" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
