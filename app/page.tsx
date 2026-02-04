"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Redirect user to sign-in if not logged in
        router.push("/auth/signin");
      } else {
        router.push("/chat");
      }
    });
  }, [supabase.auth, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-orange-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/Logo/orange_logo_with_blue_text.png"
              alt="Chatrigo Logo"
              width={180}
              height={60}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-600">
            Logged in as:{" "}
            <span className="font-semibold text-orange-600">{user.email}</span>
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/chat")}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Go to Chat
          </button>

          <button
            onClick={handleSignOut}
            className="w-full bg-white text-gray-700 font-medium py-3.5 px-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
