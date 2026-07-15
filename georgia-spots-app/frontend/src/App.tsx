import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { AuthGateProvider } from "./AuthGate";
import { Header } from "./components/Header";
import { MapPage } from "./pages/MapPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { AddPlacePage } from "./pages/AddPlacePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGateProvider>
          <div className="min-h-screen bg-[color:var(--color-bg)]">
            <Header />
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/place/:id" element={<PlaceDetailPage />} />
              <Route path="/add" element={<AddPlacePage />} />
              <Route path="/edit/:id" element={<AddPlacePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users/:username" element={<PublicProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </div>
        </AuthGateProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
