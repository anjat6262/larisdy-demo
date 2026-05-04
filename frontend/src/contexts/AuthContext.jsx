import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { clearStoredAuth, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from "../utils/authStorage";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()) && !getStoredUser());
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function bootstrapUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const shouldBlockRendering = !user;

      if (shouldBlockRendering) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }

      try {
        const currentUser = await authService.getCurrentUser(token, abortController.signal);

        if (isMounted) {
          setStoredUser(currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        if (isMounted) {
          if (error?.status === 401) {
            clearStoredAuth();
            setToken(null);
            setUser(null);
            setIsLoading(false);
            showToast("Sesi login admin sudah tidak valid. Silakan masuk kembali.", "error");
            return;
          }

          const hasCachedUser = Boolean(user || getStoredUser());

          if (!hasCachedUser) {
            clearStoredAuth();
            setToken(null);
            setUser(null);
            showToast("Sesi login berakhir. Silakan masuk kembali.", "error");
          }
        }
      } finally {
        if (isMounted && shouldBlockRendering) {
          setIsLoading(false);
        }
      }
    }

    bootstrapUser();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [token]);

  function storeToken(nextToken) {
    setStoredToken(nextToken);
    setToken(nextToken);
  }

  function storeUser(nextUser) {
    setStoredUser(nextUser);
    setUser(nextUser);
  }

  async function login(credentials) {
    const response = await authService.login(credentials);
    storeToken(response.token);
    storeUser(response.user);
    setIsLoading(false);
    showToast("Login berhasil.");
    return response.user;
  }

  async function register(payload) {
    const response = await authService.register(payload);
    storeToken(response.token);
    storeUser(response.user);
    setIsLoading(false);
    showToast("Akun berhasil dibuat.");
    return response.user;
  }

  async function logout() {
    try {
      if (token) {
        await authService.logout(token);
      }
    } finally {
      clearStoredAuth();
      storeToken(null);
      setUser(null);
      setIsLoading(false);
      showToast("Berhasil logout.");
    }
  }

  async function updateProfile(payload) {
    const updatedUser = await profileService.update(token, payload);
    storeUser(updatedUser);
    showToast("Profil berhasil diperbarui.");
    return updatedUser;
  }

  const value = {
    token,
    user,
    isLoading,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === "admin",
    isCustomer: user?.role === "customer",
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }

  return context;
}
