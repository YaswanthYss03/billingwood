'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getDefaultPageForRole } from '@/lib/permissions';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuthStore();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const defaultPage = getDefaultPageForRole(user.role as any);
      router.replace(defaultPage);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      
      // Get user from store after successful login
      const { user } = useAuthStore.getState();
      const defaultPage = user ? getDefaultPageForRole(user.role as any) : '/dashboard';
      
      toast.success('Login successful!');
      router.push(defaultPage);
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Logo - Top Left Corner */}
      <div className="absolute top-4 left-8 z-10">
        <Image 
          src="/Untitled.png" 
          alt="CalcuBill Logo" 
          width={180} 
          height={54}
          priority
          className="object-contain"
        />
      </div>

      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-20">
        <div className="max-w-md w-full space-y-8">
          {/* Welcome Text */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your username and password to access your account.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me */}
            {/* <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                Remember Me
              </label>
            </div> */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 items-center justify-center px-12">
        <div className="max-w-lg text-white space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Effortlessly manage your operations.
            </h1>
            <p className="mt-4 text-indigo-100 text-lg">
              Log in to access your BOP dashboard and manage your operations.
            </p>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="space-y-4">
              {/* Top Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-500/50 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-indigo-500/70 hover:shadow-xl">
                  <p className="text-xs text-indigo-100">Total Sales</p>
                  <p className="text-2xl font-bold mt-1">$189,374</p>
                  <p className="text-xs text-green-300 mt-1">+12% vs last month</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-xl">
                  <p className="text-xs text-indigo-100">Total Profit</p>
                  <p className="text-2xl font-bold mt-1">$25,684</p>
                  <div className="mt-2 h-8 bg-white/10 rounded"></div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="bg-white/20 rounded-lg p-4 h-32 flex items-end justify-between gap-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-xl">
                {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                  <div
                    key={i}
                    className="bg-indigo-300 rounded-t flex-1 transition-all duration-300 hover:bg-indigo-200"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:shadow-lg">
                  <p className="text-xs text-indigo-100">Active</p>
                  <p className="text-xl font-bold">6.2k</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:shadow-lg">
                  <p className="text-xs text-indigo-100">Pending</p>
                  <p className="text-xl font-bold">248</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:shadow-lg">
                  <p className="text-xs text-indigo-100">Units</p>
                  <p className="text-xl font-bold">6.2k</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-indigo-200">
            Copyright © 2025 CalcuBill Enterprises LTD.
          </p>
        </div>
      </div>
    </div>
  );
}
