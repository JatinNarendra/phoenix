"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getBotUrl } from "../lib/telegram";

const NotTelegramApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#1A1B1E] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mb-8">
          <Image
            src="/images/telegram-logo.png"
            alt="Telegram Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Open in Telegram
        </h1>
        
        <p className="text-gray-400 mb-6">
          This game is designed to be played within the Telegram app. Please open it using Telegram for the best experience.
        </p>
        
        <Link 
          href={getBotUrl()}
          className="inline-block bg-[#FCC204] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#E6B004] transition-colors"
        >
          Open in Telegram
        </Link>
      </div>
    </div>
  );
};

export default NotTelegramApp;