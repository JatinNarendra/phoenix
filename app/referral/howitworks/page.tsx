"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// Remove image imports - we'll use src paths instead
import Image from "next/image";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useUser } from "@/app/hooks/useUser";
import { useGame } from "@/app/context/GameContext";
import { gameToast } from "@/app/utility/customToast";
import { generateDirectMiniAppReferralLink } from "@/app/lib/referralHelpers";

const HowItWorksPage = () => {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const user = useUser();
  const { gameState, persistState } = useGame();

  // Save the link to game state if it doesn't exist
  useEffect(() => {
    if (user.id && !gameState.referral?.inviteLink) {
      const link = generateDirectMiniAppReferralLink(user.id.toString());
      persistState((prevState) => ({
        ...prevState,
        referral: {
          ...(prevState.referral || { referredFriends: 0, totalRewards: 0 }),
          inviteLink: link,
        },
      }));
    }
  }, [user.id, gameState.referral?.inviteLink, persistState]);

  // Handle copying to clipboard
  const handleCopyLink = useCallback(async () => {
    // Use the direct mini app link for better compatibility
    const linkToCopy = generateDirectMiniAppReferralLink(user.id.toString());

    if (linkToCopy) {
      try {
        await navigator.clipboard.writeText(linkToCopy);
        gameToast.success("Link copied to clipboard");

        // Optional haptic feedback if in Telegram
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.impactOccurred("light");
        }
      } catch (err) {
        console.error("Failed to copy link:", err);
        gameToast.error("Failed to copy link");
      }
    }
  }, [WebApp, user.id]);

  // Handle sharing via app
  const handleShareViaApp = useCallback(() => {
    // Use the direct mini app link for better compatibility
    const linkToShare = generateDirectMiniAppReferralLink(user.id.toString());
    const messageText = `Join me in Phoenix Game and get bonus rewards instantly! 🎮 Just click the link to open the game and claim your bonus! \n\n${linkToShare}`;

    if (linkToShare) {
      if (typeof window !== "undefined" && navigator.share) {
        // Use Web Share API if available
        navigator
          .share({
            title: "Join Phoenix Game",
            text: messageText,
            url: linkToShare,
          })
          .catch((err) => console.error("Share error:", err));
      } else if (WebApp) {
        // Fallback to Telegram specific sharing
        const a = document.createElement("a");
        a.href = `https://t.me/share/url?url=${encodeURIComponent(
          linkToShare
        )}&text=${encodeURIComponent(messageText)}`;
        a.setAttribute("target", "_blank");
        a.click();
      }

      // Optional haptic feedback
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred("medium");
      }
    }
  }, [WebApp, user.id]);

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/referral");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto p-4 font-bold font-['Rounded_Mplus_1c_Bold']">
      <div className="container mx-auto pt-8 relative">
        <Image
          src="/assets/Referral/ReferralMainBG.png"
          alt="How It Works Background"
          style={{ width: "auto", height: "auto" }}
          className="rounded-lg"
        />

        <div className="relative left-4 right-4 text-center mt-4">
          <span className="text-white text-3xl font-bold block">
            Invite To Get Bonus
          </span>
          <p className="text-sm text-[#909090]">
            Get <span className="text-[#E18700] font-bold">50,000 SPARK</span>{" "}
            per invited friend & bonus reward for level up by your friends
          </p>
        </div>
      </div>

      <div
        className="mt-8 bg-cover bg-center p-4 rounded-lg"
        style={{
          backgroundImage: `url(/assets/howitworks/how-it-works-invite-link-bg.png)`,
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/assets/Referral/ReferralHandShakeIcon.png"
              alt="Handshake Icon"
              style={{ width: "auto", height: "auto" }}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Invite Link</h1>
              <p className="text-gray-400 z-10">
                Invite your friends and get bonus!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2"
              onClick={handleShareViaApp}
            >
              <Image
                src="/assets/Referral/InviteFriends.png"
                alt="Invite Link"
                style={{ width: "auto", height: "auto" }}
                className="rounded-lg"
              />
            </button>
            <button onClick={handleCopyLink}>
              <Image
                src="/assets/Referral/InviteLinkCopy.png"
                alt="Invite Button"
                style={{ width: "auto", height: "auto" }}
                className="cursor-pointer rounded-lg"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Socials Grid */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        {[
          {
            icon: "/assets/howitworks/telegram-icon.png",
            name: "Telegram",
            url: "https://t.me/SparkyTapGame",
          },
          {
            icon: "/assets/howitworks/x-icon.png",
            name: "X",
            url: "https://x.com/TheSparkyVerse",
          },
          {
            icon: "/assets/howitworks/discord-icon.png",
            name: "Discord",
            url: "https://discord.gg/phoenixgame",
          },
          {
            icon: "/assets/websiteicon.png",
            name: "Website",
            url: "https://sparky.zone/",
          },
        ].map((platform, index) => (
          <a
            key={index}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cover bg-center p-6 flex items-center gap-4"
            style={{
              backgroundImage: `url(/assets/howitworks/how-it-works-socials-bg.png)`,
            }}
          >
            <Image
              src={platform.icon}
              alt={`${platform.name} Icon`}
              style={{ width: "auto", height: "auto" }}
            />
            <span className="text-lg">{platform.name}</span>
          </a>
        ))}
      </div>
    </main>
  );
};

export default HowItWorksPage;
