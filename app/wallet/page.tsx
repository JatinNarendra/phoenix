"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to spin page immediately
    router.push("/spin");
  }, [router]);

  return null; // No UI needed as we're redirecting
};

export default Page;
