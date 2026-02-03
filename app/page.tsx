"use client";

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
      setUser(user);
      setLoading(false);
    });
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  if (loading) {
    return <div style={{ padding: "50px" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: "50px" }}>
        <h1>Not signed in</h1>
        <a href="/auth/signin">Sign in</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "50px" }}>
      <h1>Welcome, {user.user_metadata.name}!</h1>
      <p>Email: {user.email}</p>
      <button onClick={handleSignOut} style={{ marginTop: "20px" }}>
        Sign Out
      </button>
    </div>
  );
}