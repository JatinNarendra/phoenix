"use client";

import React from "react";

export default function TestPage() {
  console.log("TestPage: Rendering test page");
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4">Nexus Test Page</h1>
      <p className="text-gray-700 mb-4">If you can see this, basic rendering is working.</p>
      <div className="p-4 bg-gray-100 rounded-md">
        <code>This is a test page to debug rendering issues.</code>
      </div>
    </div>
  );
} 