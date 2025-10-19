"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaUsers, FaChartLine } from "react-icons/fa";

export default function NexusSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 bg-white border-r border-gray-100 fixed left-0 top-12 bottom-0 z-40">
        <nav className="flex-1 py-6">
          <div className="flex flex-col items-center gap-6">
            {[
              { href: "/nexus", icon: FaHome, label: "Home" },
              { href: "/nexus/customers", icon: FaUsers, label: "Customers" },
              {
                href: "/nexus/analytics",
                icon: FaChartLine,
                label: "Analytics",
              },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div
                  className={`relative group p-4 rounded-lg transition-all duration-200 ${
                    pathname === href
                      ? "bg-blue-100 text-blue-600 shadow-md"
                      : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                  }`}
                >
                  <Icon className="text-xl" />
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-blue-100 text-gray-900 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg font-medium">
                    {label}
                    {/* Left-pointing arrow */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-blue-100 rotate-45"></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 md:hidden z-40">
        <div className="flex justify-around py-3">
          {[
            { href: "/nexus", icon: FaHome, label: "Home" },
            { href: "/nexus/customers", icon: FaUsers, label: "Customers" },
            { href: "/nexus/analytics", icon: FaChartLine, label: "Analytics" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <div
                className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
                  pathname === href
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <Icon className="text-xl mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
