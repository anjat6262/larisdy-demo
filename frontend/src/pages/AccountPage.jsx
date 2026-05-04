import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusCard from "../components/common/StatusCard";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function AccountPage() {
  const navigate = useNavigate();
  const { user, isAdmin, logout, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
    });
  }, [user]);

  function updateField(event) {
    const { name, value } = event.target;
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile(profileForm);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <h1 className="page-title">Akun Saya</h1>

        <div className="my-12 grid gap-10 min-[993px]:grid-cols-[minmax(260px,320px)_1fr]">
          <aside className="account-sidebar">
            <div className="account-user-info">
              <div className="account-avatar">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
              </div>
              <div>
                <p className="account-name">{user?.name}</p>
                <p className="account-email">{user?.email}</p>
                <p className="role-chip inline-role-chip">{user?.role}</p>
              </div>
            </div>

            <div className="account-menu">
              <button type="button" className="account-menu-btn active">
                Profil
              </button>
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    className="account-menu-btn"
                    onClick={() => navigate("/admin")}
                  >
                    Dashboard Admin
                  </button>
                  <button
                    type="button"
                    className="account-menu-btn"
                    onClick={() => navigate("/admin/orders")}
                  >
                    Kelola Pesanan
                  </button>
                  <button
                    type="button"
                    className="account-menu-btn"
                    onClick={() => navigate("/admin/products")}
                  >
                    Kelola Produk
                  </button>
                  <button
                    type="button"
                    className="account-menu-btn"
                    onClick={() => navigate("/admin/reports")}
                  >
                    Laporan Penjualan
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="account-menu-btn"
                  onClick={() => navigate("/orders")}
                >
                  Pesanan Saya
                </button>
              )}
              <button type="button" className="account-menu-btn danger" onClick={logout}>
                Logout
              </button>
            </div>
          </aside>

          <div className="account-content">
            <form onSubmit={handleProfileSubmit}>
              <h2 className="section-heading">Informasi Profil</h2>
              <StatusCard compact>
                <p>
                  {isAdmin
                    ? "Akun admin bisa mengelola pesanan dan produk dari dashboard khusus admin."
                    : "Profil akun tersinkron dengan Laravel API, dan status pesanan Anda tersedia di halaman Pesanan Saya."}
                </p>
              </StatusCard>

              <div className="form-group">
                <label htmlFor="profileName">Nama Lengkap</label>
                <input
                  id="profileName"
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profileEmail">Email</label>
                <input id="profileEmail" type="email" value={user?.email ?? ""} disabled />
                <p className="helper-text">Email tidak dapat diubah.</p>
              </div>

              <div className="form-group">
                <label htmlFor="profilePhone">Nomor Telepon</label>
                <input
                  id="profilePhone"
                  type="tel"
                  name="phone"
                  value={profileForm.phone}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profileAddress">Alamat</label>
                <textarea
                  id="profileAddress"
                  name="address"
                  value={profileForm.address}
                  onChange={updateField}
                  required
                />
              </div>

              <button type="submit" className="btn-primary ui-ripple" disabled={isSavingProfile}>
                {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccountPage;
