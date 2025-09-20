"use client";

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b0808] text-white p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Page Not Found</h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors text-lg"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
} 