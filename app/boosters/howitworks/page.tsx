"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image'
import { useWebApp } from "@/app/hooks/useWebApp";
import boosttappower from "@/public/assets/boosttappower.png";
import playendlessly from '@/public/assets/playendlessly.png'
import winwithfriends from '@/public/assets/winwithfriends.png'
import boostwithreward from '@/public/assets/boostwithreward.png'
import xicon from '@/public/assets/xicon.png'
import telegramicon from '@/public/assets/telegramicon.png'
import discordicon from '@/public/assets/discordicon.png'
import websiteicon from "@/public/assets/websiteicon.png";

const HowItWorksPage = () => {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();
      
      const handleBack = () => {
        router.push('/boosters');
      };

      WebApp.BackButton.onClick(handleBack);
      WebApp.onEvent('backButtonClicked', handleBack);
      
      return () => {
        WebApp.BackButton.offClick(handleBack);
        WebApp.offEvent('backButtonClicked', handleBack);
      };
    }
  }, [WebApp, router]);

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto p-4 font-bold font-['Rounded_Mplus_1c_Bold'] bg-black text-white overflow-y-auto overflow-x-hidden relative">
      {/* Header Section */}
      <div className="container mx-auto pt-10 text-center space-y-4 h-full">
        <div className="relative w-full max-w-[200px] mx-auto mb-4">
          <Image
            src={boostwithreward}
            alt="Boost With Rewards"
            width={200}
            height={200}
            style={{ width: "100%", height: "auto" }}
            className="rounded-lg"
          />
        </div>
        <div className="relative w-full h-[70px]  ">
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <h1 className="text-3xl font-bold">Boost With Rewards</h1>
            <p className="text-sm text-gray-400 font-normal">
              Make your gameplay easier and maximize your rewards with powerful
              boosters!
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-8 p-2 space-y-6 bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] rounded-[10px]">
        {/* Boost Tap Power */}
        <div className=" p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Image
              src={boosttappower}
              alt="Boost Tap Power"
              width={48}
              height={48}
              style={{ width: "48px", height: "48px" }}
              className="rounded-lg"
            />
            <div>
              <h2 className="text-xl text-white">Boost Tap Power</h2>
              <p className="text-sm text-gray-400 font-normal">
                Purchase boosters to become more powerful and gain more SPARK!
              </p>
            </div>
          </div>
        </div>

        {/* Play Endlessly */}
        <div className="p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Image
              src={playendlessly}
              alt="Play Endlessly"
              width={48}
              height={48}
              style={{ width: "48px", height: "48px" }}
              className="rounded-lg"
            />
            <div>
              <h2 className="text-xl text-white">Play Endlessly!</h2>
              <p className="text-sm text-gray-400 font-normal">
                Play while you sleep by awakening the Tap Knight—it plays for
                you!
              </p>
            </div>
          </div>
        </div>

        {/* Win With Friends */}
        <div className=" p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Image
              src={winwithfriends}
              alt="Win With Friends"
              width={48}
              height={48}
              style={{ width: "48px", height: "48px" }}
              className="rounded-lg"
            />
            <div>
              <h2 className="text-xl text-white">Win With Friends!</h2>
              <p className="text-sm text-gray-400">
                Uncover the legends of each clan—their lives, battles, and
                untold stories!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <a
          href="https://t.me/devphoenixbot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-6 rounded-lg"
        >
          <Image
            src={telegramicon}
            alt="Telegram"
            width={32}
            height={32}
            style={{ width: "32px", height: "32px" }}
            className="flex-shrink-0"
          />
          <span className="ml-3">Telegram</span>
        </a>
        <a
          href="https://x.com/TheSparkyVerse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-6 rounded-lg"
        > 
          <Image
            src={xicon}
            alt="X (Twitter)"
            width={32}
            height={32}
            style={{ width: "32px", height: "32px" }}
            className="flex-shrink-0"
          />
          <span className="ml-3">X (Twitter)</span>
        </a>
        <a
          href="https://discord.gg/phoenixgame"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-6 rounded-lg"
        >
          <Image
            src={discordicon}
            alt="Discord"
            width={32}
            height={32}
            style={{ width: "32px", height: "32px" }}
            className="flex-shrink-0"
          />
          <span className="ml-3">Discord</span>
        </a>
        <a
          href="https://sparky.zone"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-6 rounded-lg"
        >
          <Image
            src={websiteicon}
            alt="Website"
            width={30}
            height={28}
            style={{ width: "30px", height: "28px" }}
            className="flex-shrink-0"
          />
          <span className="ml-3">Website</span>
        </a>
      </div>
    </main>
  );
}

export default HowItWorksPage; 