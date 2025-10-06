import type { NextPage } from 'next';
import Image from "next/image";
// Remove image imports - we'll use src paths instead
import CustomYellowButton from '@/app/ui/CustomYellowButton';

interface DailyRewardsSuccessProps {
  coins: number;
  onClose: () => void;
}

const DailyRewardsSuccess: NextPage<DailyRewardsSuccessProps> = ({ coins, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border min-h-[480px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white"
          >
            <Image src="/assets/Close.png" alt="Close" width={32} height={32} />
          </button>

          {/* Main Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-4 pt-8 gap-8">
            {/* Congratulations Image */}
            <div className="relative">
              <Image
                src="/assets/Earn/DailyRewardsCongratulations.png"
                alt="Congratulations"
                width={200}
                height={100}
                className="object-contain"
              />
            </div>
            {/* Coin Amount */}
            <div className="flex items-center gap-2">
              <Image
                src="/assets/SparkyIcon.png"
                alt="Sparky"
                width={24}
                height={24}
              />
              <span className="text-2xl font-bold text-white">
                {coins.toLocaleString()}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-400 text-center text-lg">
              You&apos;ve claimed your daily reward for today!
            </p>

            {/* Done Button */}
            <CustomYellowButton onClick={onClose} className="w-[200px] h-12 relative">
              <div className="absolute inset-0 bg-[#E18700] rounded-lg" />
              <div className="absolute inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-lg" />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                Done
              </span>
            </CustomYellowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRewardsSuccess; 