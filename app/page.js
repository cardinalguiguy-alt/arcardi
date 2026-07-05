"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/lounge" : "/login");
      setChecking(false);
    });
  }, [router]);

  return (
    <div className="wrap">
      <div className="brand">
        <div className="tiles">
          {"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}
        </div>
      </div>
      {checking && <p className="muted">Chargement…</p>}
    </div>
  );
}
