"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
// Remove image imports - we'll use src paths instead
import { supabase } from "@/lib/supabase";
import { useUser } from "../hooks/useUser";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  // Only show navbar on home page
  // Hide on referral pages (already implemented) and all other pages except home
  if (pathname !== "/") {
    return null;
  }

  const handleClick = async (href: string) => {
    if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.HapticFeedback
    ) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
    }

    // If clicking Earn, check and update application state
    if (href === "/earn" && user.id) {
      try {
        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        const { error } = await supabase
          .from("telegram_users")
          .update({
            game_state: {
              has_visited_earn_page: false,
            },
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error updating earn page visit state:", error);
        }
      } catch (error) {
        console.error("Error updating earn page visit state:", error);
      }
    }

    router.push(href);
  };

  const navItems = [
    {
      name: "Boosters",
      href: "/boosters",
      icon: "/assets/Booster.png",
      iconWidth: 30,
      iconHeight: 28,
    },
    {
      name: "Earn",
      href: "/earn",
      icon: "/assets/Earn.png",
      iconWidth: 30,
      iconHeight: 28,
    },
    {
      name: "Tap",
      href: "/",
      icon: "/assets/Tap.png",
      iconWidth: 34,
      iconHeight: 32,
    },
    {
      name: "Spin",
      href: "/spin",
      icon: "/assets/SpinIcon.png",
      iconWidth: 28,
      iconHeight: 28,
    },
    {
      name: "Invite",
      href: "/referral",
      icon: "/assets/Referral.png",
      iconWidth: 28,
      iconHeight: 28,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background ellipse with blur effect */}
      <div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[300px] h-[25px]"
        style={{
          background:
            "radial-gradient(ellipse 150px 15px at center, #D40000 0%, rgba(212, 0, 0, 0.8) 30%, transparent 100%)",
          filter: "blur(8px)",
          boxShadow:
            "0 0 40px rgba(212, 0, 0, 0.5), 0 0 80px rgba(212, 0, 0, 0.3), 0 0 120px rgba(212, 0, 0, 0.2)",
        }}
      />

      {/* Main navbar container */}
      <div
        className="w-full h-[70px] relative"
        style={{ backgroundColor: "#150404" }}
      >
        {/* Top border stripe */}
        <div
          className="absolute top-0 left-0 w-full h-[2px]"
          style={{
            background:
              "linear-gradient(to right, rgba(226, 144, 41, 0.1), rgba(246, 199, 45, 0.1))",
          }}
        />

        {/* Navigation items */}
        <nav className="absolute inset-0 flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleClick(item.href)}
              className="flex flex-col items-center justify-center gap-1 text-white/60 hover:text-white transition-colors"
            >
              <div className="flex items-center justify-center h-[32px]">
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={item.iconWidth}
                  height={item.iconHeight}
                  className="object-contain"
                  quality={100}
                />
              </div>
              <span className="text-[12px] font-bold leading-none">
                {item.name}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default NavBar;
