"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SpinPurchaseIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to spinpurchase page
    router.push("/spinpurchase");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div>Redirecting to spin purchase options...</div>
    </div>
  );
} 