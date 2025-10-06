import React from "react";
import Image from "next/image";
import WelcomeToEarnIcon from "@/public/assets/Earn/WelcomeToEarnIcon.png";
import Close from "@/public/assets/Close.png";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/hooks/useUser";

interface WelcomeToEarnPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeToEarnPopup: React.FC<WelcomeToEarnPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const user = useUser();

  if (!isOpen) return null;

  const handleClose = async () => {
    onClose();

    if (user.id && supabase) {
      try {
        // First, get the current game state
        const { data, error: fetchError } = await supabase
          .from("telegram_users")
          .select("game_state")
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        // Update the application_state within game_state
        const { error: updateError } = await supabase
          .from("telegram_users")
          .update({
            game_state: {
              ...data?.game_state,
              application_state: {
                ...(data?.game_state?.application_state || {}),
                has_visited_earn_page: true,
              },
            },
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } catch (error) {
        console.error("Error updating earn page visit status:", error);
      }
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 flex items-end justify-center z-[9999] bg-black/50 backdrop-blur-md">
      <div className="relative w-full mx-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
          <Image src={Close.src} alt="Close" width={32} height={32} />
        </button>

        {/* Main popup container */}
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border h-[450px]">
          <div className="relative h-full p-8">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full flex flex-col items-center gap-4">
                <div className="mb-4">
                  <Image
                    src={WelcomeToEarnIcon.src}
                    alt="Welcome to Earn"
                    width={180}
                    height={132}
                    priority
                  />
                </div>
                <b className="w-full relative tracking-[-0.02em] leading-[140%] text-[28px] font-['Rounded_Mplus_1c_Bold'] text-[#e18700] text-center">
                  <p className="m-0">Welcome to Earn</p>
                </b>
                <p className="w-[329px] relative text-[16px] tracking-[-0.02em] leading-[140%] font-['Rounded_Mplus_1c'] text-white opacity-60 text-center inline-block">
                  I accept Sparky doesn&apos;t take responsibility for sponsored
                  content.{" "}
                </p>
              </div>

              <button onClick={handleClose} className="mt-8 w-[60%]">
                <Image
                  src="/assets/Earn/ContinueButton.png"
                  alt="Let's Get Started!"
                  width={300}
                  height={60}
                  className="w-full"
                  priority
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeToEarnPopup;
