"use client";

import React from "react";
import { FaTelegram } from "react-icons/fa";
import { getBotUrl } from "../lib/telegram";

export default function NotTelegramApp() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1b0808] text-white p-4">
      <div className="max-w-md text-center space-y-6">
        <FaTelegram className="text-6xl mx-auto mb-6" />
        <h1 className="text-3xl font-bold">Telegram Mini App Only</h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          This application is designed to work exclusively within Telegram.
          Please open it through Telegram to access all features.
        </p>
        <a
            href={getBotUrl()}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors text-lg"
          >
          Open in Telegram
        </a>
      </div>
    </div>
  );
}
