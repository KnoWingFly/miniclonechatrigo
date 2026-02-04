"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from 'next/image';
import { Mail, Eye, EyeOff, User } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import Link from 'next/link';

export default function SignUpPage() {
    const supabase = createClient();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                router.push('/chat');
            }
        });

        return () => subscription.unsubscribe();
    }, [router, supabase.auth]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!username.trim()) {
            setError('Username is required');
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username.trim(),
                    name: username.trim(),
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Check email confirmation
            if (data?.session) {
                router.push('/');
            } else {
                setSuccess('Account created successfully! Please check your email to verify your account.');
                setLoading(false);
            }
        }
    };

    const handleGoogleSignUp = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-4">
            {/* Main card */}
            <div className="w-full max-w-md">
                {/* White card container */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/Logo/orange_logo_with_blue_text.png"
                            alt="Chatrigo"
                            width={200}
                            height={60}
                            className="mx-auto"
                            priority
                        />
                    </div>

                    {/* Welcome text */}
                    <div className="text-center mb-2">
                        <h1 className="text-3xl font-bold text-[#1a3a52] mb-2">
                            Create Account
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Sign up to get started with Chatrigo
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignUp} className="mt-8 space-y-4">
                        {/* Username field */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    required
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                />
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            </div>
                        </div>

                        {/* Email field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                />
                                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            </div>
                        </div>

                        {/* Password field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError(false);
                                    }}
                                    onBlur={() => {
                                        if (password.length > 0 && password.length < 8) {
                                            setPasswordError(true);
                                        }
                                    }}
                                    placeholder="Enter your password (min. 8 characters)"
                                    required
                                    minLength={8}
                                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none transition-all placeholder:text-gray-400 ${passwordError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                                            : 'border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className={`text-xs mt-1 ${passwordError ? 'text-red-500' : 'text-gray-500'
                                }`}>
                                Must be at least 8 characters
                            </p>
                        </div>

                        {/* Confirm Password field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setConfirmPasswordError(false);
                                    }}
                                    onBlur={() => {
                                        if (confirmPassword.length > 0 && password !== confirmPassword) {
                                            setConfirmPasswordError(true);
                                        }
                                    }}
                                    placeholder="Confirm your password"
                                    required
                                    minLength={8}
                                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none transition-all placeholder:text-gray-400 ${confirmPasswordError
                                            ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                                            : 'border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {confirmPasswordError && (
                                <p className="text-xs text-red-500 mt-1">
                                    Passwords do not match
                                </p>
                            )}
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Success message */}
                        {success && (
                            <div className="text-green-600 text-sm text-center bg-green-50 py-2 rounded-lg">
                                {success}
                            </div>
                        )}

                        {/* Sign up button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold py-3 rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">Or sign up with</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Google sign-up button */}
                    <button
                        onClick={handleGoogleSignUp}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        <FcGoogle className="w-5 h-5" />
                        Sign up with Google
                    </button>

                    {/* Sign in link */}
                    <p className="text-center text-sm text-gray-600 mt-6">
                        Already have an account?{' '}
                        <Link
                            href="/auth/signin"
                            className="text-orange-500 hover:text-orange-600 font-semibold transition-colors"
                        >
                            Sign in here
                        </Link>
                    </p>

                    {/* Copyright */}
                    <p className="text-center text-xs text-gray-500 mt-8">
                        © 2026 Chatrigo. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
