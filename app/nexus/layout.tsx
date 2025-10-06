"use client";

import React from 'react';

export default function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NexusDashboard now handles all nexus layout logic
  // This layout just passes through the children
  return <>{children}</>;
}
