"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type InvestmentHorizon = "Short-Term" | "Medium-Term" | "Long-Term";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  investmentHorizon: InvestmentHorizon;
  watchlist: string[];
  joinedDate: string;
}

interface AuthContextProps {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "login" | "signup" | "profile";
  openAuthModal: (tab?: "login" | "signup" | "profile") => void;
  closeAuthModal: () => void;
  signUp: (username: string, email: string, password: string, displayName: string, horizon: InvestmentHorizon) => Promise<boolean>;
  logIn: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logOut: () => void;
  updateProfile: (updatedFields: Partial<UserProfile>) => Promise<boolean>;
  toggleWatchlist: (symbol: string) => void;
  setAuthModalTab: (tab: "login" | "signup" | "profile") => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Non-plain-text security simulation hashing helper
const simulateHash = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return `client-secured-${hash.toString(16)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup" | "profile">("login");

  // Load active session from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeSession = localStorage.getItem("auth_active_session");
      if (activeSession) {
        try {
          const sessionUser = JSON.parse(activeSession);
          setUser(sessionUser);
        } catch (e) {
          console.error("Failed to load auth session", e);
        }
      }
      setIsLoading(false);
    }
  }, []);

  const openAuthModal = (tab: "login" | "signup" | "profile" = "login") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signUp = async (
    username: string,
    email: string,
    password: string,
    displayName: string,
    horizon: InvestmentHorizon
  ): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    // Get current registered users
    const rawUsers = localStorage.getItem("auth_registered_users");
    let usersList = rawUsers ? JSON.parse(rawUsers) : [];

    // Check if user already exists
    const userExists = usersList.some(
      (u: any) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
    );

    if (userExists) {
      return false;
    }

    const newUserProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      username,
      email,
      displayName: displayName || username,
      bio: "Self-directed financial strategist and portfolio optimizer.",
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      investmentHorizon: horizon,
      watchlist: ["AAPL", "TSLA", "NVDA", "MSFT"],
      joinedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }),
    };

    const newUserCredentials = {
      profile: newUserProfile,
      passwordHash: simulateHash(password),
    };

    // Save user
    usersList.push(newUserCredentials);
    localStorage.setItem("auth_registered_users", JSON.stringify(usersList));

    // Log the user in
    setUser(newUserProfile);
    localStorage.setItem("auth_active_session", JSON.stringify(newUserProfile));

    // Also sync watchlist with StockContext local storage so the global view picks it up
    localStorage.setItem("dashboard_watchlist", JSON.stringify(newUserProfile.watchlist));
    window.dispatchEvent(new Event("storage")); // Trigger reactive sync across components

    return true;
  };

  const logIn = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    const rawUsers = localStorage.getItem("auth_registered_users");
    if (!rawUsers) return false;

    const usersList = JSON.parse(rawUsers);
    const hashedPassword = simulateHash(password);

    const matchedUser = usersList.find(
      (u: any) =>
        (u.profile.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
          u.profile.email.toLowerCase() === usernameOrEmail.toLowerCase()) &&
        u.passwordHash === hashedPassword
    );

    if (matchedUser) {
      setUser(matchedUser.profile);
      localStorage.setItem("auth_active_session", JSON.stringify(matchedUser.profile));

      // Sync watchlist with StockContext local storage so the global view picks it up
      localStorage.setItem("dashboard_watchlist", JSON.stringify(matchedUser.profile.watchlist));
      window.dispatchEvent(new Event("storage")); // Trigger reactive sync across components

      return true;
    }

    return false;
  };

  const logOut = () => {
    setUser(null);
    localStorage.removeItem("auth_active_session");
    // Clear watchlist override
    localStorage.removeItem("dashboard_watchlist");
    window.dispatchEvent(new Event("storage"));
    setIsAuthModalOpen(false);
  };

  const updateProfile = async (updatedFields: Partial<UserProfile>): Promise<boolean> => {
    if (!user || typeof window === "undefined") return false;

    const updatedUser = { ...user, ...updatedFields };

    // Update in session
    setUser(updatedUser);
    localStorage.setItem("auth_active_session", JSON.stringify(updatedUser));

    // Update in registered users database
    const rawUsers = localStorage.getItem("auth_registered_users");
    if (rawUsers) {
      const usersList = JSON.parse(rawUsers);
      const updatedUsersList = usersList.map((u: any) => {
        if (u.profile.id === user.id) {
          return {
            ...u,
            profile: updatedUser,
          };
        }
        return u;
      });
      localStorage.setItem("auth_registered_users", JSON.stringify(updatedUsersList));
    }

    // Sync watchlist if that changed
    if (updatedFields.watchlist) {
      localStorage.setItem("dashboard_watchlist", JSON.stringify(updatedFields.watchlist));
      window.dispatchEvent(new Event("storage"));
    }

    return true;
  };

  // Sync user-specific watchlist toggle
  const toggleWatchlist = (symbol: string) => {
    if (!user) return;

    let nextWatchlist: string[];
    if (user.watchlist.includes(symbol)) {
      nextWatchlist = user.watchlist.filter((s) => s !== symbol);
    } else {
      nextWatchlist = [...user.watchlist, symbol];
    }

    updateProfile({ watchlist: nextWatchlist });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signUp,
        logIn,
        logOut,
        updateProfile,
        toggleWatchlist,
        setAuthModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
