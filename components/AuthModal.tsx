"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth, InvestmentHorizon } from "../context/AuthContext";
import { useStock } from "../context/StockContext";
import { X, User, Mail, Lock, ShieldCheck, HelpCircle, Briefcase, Calendar, Check, Compass } from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    signUp,
    logIn,
    user,
    updateProfile,
    setAuthModalTab,
  } = useAuth();

  const { triggerToast } = useStock();

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [horizon, setHorizon] = useState<InvestmentHorizon>("Medium-Term");
  const [bio, setBio] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync profile editing fields when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setHorizon(user.investmentHorizon || "Medium-Term");
      setBio(user.bio || "");
    }
  }, [user]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username || !password) {
      setErrorMsg("Please fill in all credentials.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await logIn(username, password);
      if (success) {
        triggerToast("Logged in successfully!", "success");
        closeAuthModal();
        // Clear form
        setUsername("");
        setPassword("");
      } else {
        setErrorMsg("Invalid username/email or password.");
      }
    } catch (e) {
      setErrorMsg("An unexpected secure authentication error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (username.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }

    if (!email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await signUp(username, email, password, displayName, horizon);
      if (success) {
        triggerToast("Account created and loaded!", "success");
        closeAuthModal();
        // Clear form
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setDisplayName("");
      } else {
        setErrorMsg("Username or email already registered.");
      }
    } catch (e) {
      setErrorMsg("Failed to complete secure registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!displayName.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateProfile({
        displayName,
        investmentHorizon: horizon,
        bio,
      });
      if (success) {
        triggerToast("Profile successfully synchronized!", "success");
        closeAuthModal();
      } else {
        setErrorMsg("Failed to synchronize profile preferences.");
      }
    } catch (e) {
      setErrorMsg("Error saving profile changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSeedUsers = () => {
    if (typeof window === "undefined") return;
    const rawUsers = localStorage.getItem("auth_registered_users");
    let usersList = rawUsers ? JSON.parse(rawUsers) : [];
    
    const demoUser = {
      profile: {
        id: "usr-demo",
        username: "demo_trader",
        email: "demo@intelligence.io",
        displayName: "Demo Trader",
        bio: "Quantitative finance strategist with a focus on tech index futures.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        investmentHorizon: "Long-Term" as InvestmentHorizon,
        watchlist: ["AAPL", "NVDA", "TSLA"],
        joinedDate: "June 2026",
      },
      // Hashed representation for "password123"
      passwordHash: "client-secured-1fbe14c5", 
    };

    const exists = usersList.some((u: any) => u.profile.username === "demo_trader");
    if (!exists) {
      usersList.push(demoUser);
      localStorage.setItem("auth_registered_users", JSON.stringify(usersList));
    }
    
    // Fill credentials in UI for easy access
    setUsername("demo_trader");
    setPassword("password123");
    setErrorMsg(null);
    triggerToast("Seeded demo_trader account! Password: password123", "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" id="auth-modal">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5">
        
        {/* Glow corner decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span className="font-sans font-bold text-sm tracking-tight text-zinc-100">
              {authModalTab === "login" && "Secure Console Authentication"}
              {authModalTab === "signup" && "Register Secure Node Account"}
              {authModalTab === "profile" && "Manage Profile & Horizons"}
            </span>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs for switching Login / Signup when not logged in */}
        {!user && (
          <div className="flex border-b border-zinc-900 bg-zinc-950/50">
            <button
              onClick={() => { setAuthModalTab("login"); setErrorMsg(null); }}
              className={`flex-1 py-3 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                authModalTab === "login"
                  ? "border-blue-500 text-blue-400 bg-blue-500/[0.02]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => { setAuthModalTab("signup"); setErrorMsg(null); }}
              className={`flex-1 py-3 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                authModalTab === "signup"
                  ? "border-blue-500 text-blue-400 bg-blue-500/[0.02]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              CREATE NODE
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono flex items-start gap-2 animate-shake">
              <span className="font-bold select-none">[!]</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {authModalTab === "login" && !user && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Username or Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="demo_trader or demo@intelligence.io"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Secure Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-sans font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Authorize Credentials"
                  )}
                </button>
              </div>

              {/* Seeding Box */}
              <div className="mt-6 pt-4 border-t border-zinc-900/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Need an account for testing?</span>
                  <button
                    type="button"
                    onClick={handleQuickSeedUsers}
                    className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                  >
                    Load Demo Credentials
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {authModalTab === "signup" && !user && (
            <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                    Node Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex_gold"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                    Display Name
                  </label>
                  <div className="relative">
                    <Compass className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex G."
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@horizon.com"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Investment Horizon Preference */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Preferred Investment Horizon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Short-Term", "Medium-Term", "Long-Term"] as InvestmentHorizon[]).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorizon(h)}
                      className={`py-2 px-2 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        horizon === h
                          ? "bg-blue-500/10 border-blue-500 text-blue-400"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                    Confirm
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-sans font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Register & Authenticate"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOGGED-IN PROFILE MANAGEMENT */}
          {user && (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* User overview mini card */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 relative">
                  <Image
                    src={user.avatarUrl}
                    alt={user.displayName}
                    fill
                    sizes="56px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                    <span className="text-[8px] font-mono font-bold text-zinc-400">NODE</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold font-sans text-zinc-100 flex items-center gap-1.5">
                    {user.displayName}
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">@{user.username} • {user.email}</div>
                  <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                    <Calendar className="h-3 w-3" />
                    <span>Active since {user.joinedDate}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Display Profile Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-4 text-xs font-mono text-zinc-200 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
                  Strategic Profile Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-4 text-xs font-mono text-zinc-200 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Investment Horizon Preference */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Preferred Investment Horizon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Short-Term", "Medium-Term", "Long-Term"] as InvestmentHorizon[]).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorizon(h)}
                      className={`py-2 px-2 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        horizon === h
                          ? "bg-blue-500/10 border-blue-500 text-blue-400"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[9px] text-zinc-500 font-mono leading-normal flex items-start gap-1">
                  <HelpCircle className="h-3 w-3 mt-0.5 text-zinc-600 shrink-0" />
                  <span>
                    Your preferred horizon filters asset screening advice and highlights specific forecast indicators matching your timescale.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-sans font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save & Synchronize Changes"
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
