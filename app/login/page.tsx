"use client";
import React, { useState, Suspense } from "react";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Where to go after signing in. Only same-origin paths are honoured, so a crafted
   * `?next=https://evil.example` cannot bounce a customer off-site after login.
   */
  const nextParam = searchParams.get("next") || "";
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      window.location.href = safeNext;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="px-5 pb-5 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-8">
          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg shadow-orange-200">
            M
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-sm text-gray-500 mt-2">Enter your credentials to access your account</p>
        </div>

        <form className="space-y-5 px-5 pb-6 sm:px-8" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-orange-600 font-medium hover:text-orange-700">Forgot password?</a>
          </div>

          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-orange-200 flex items-center justify-center gap-2 group">
            Sign In
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="p-6 text-center text-sm text-gray-600 border-t border-gray-100 mt-6">
          Don't have an account? <Link href="/signup" className="text-orange-600 font-bold hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm font-semibold text-gray-500">Loading sign inÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
