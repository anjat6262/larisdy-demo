import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StatusCard from "./StatusCard";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <StatusCard>
            <h2>Memuat sesi Anda...</h2>
        <p>Menyiapkan data akun dan pesanan Anda.</p>
          </StatusCard>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user?.role;

    if (!allowedRoles.includes(userRole)) {
      return (
        <section className="page-section">
          <div className="container">
            <StatusCard>
              <h2>Akses Ditolak</h2>
              <p>Halaman ini hanya bisa diakses oleh role yang sesuai.</p>
            </StatusCard>
          </div>
        </section>
      );
    }
  }

  return children;
}

export default ProtectedRoute;
