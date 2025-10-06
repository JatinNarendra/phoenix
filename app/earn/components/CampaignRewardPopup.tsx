import React from 'react';
import Image from 'next/image';
import CampaignRewardClicktoOpen from "@/public/assets/CampaignRewardClicktoOpen.png";
import CampaignRewardOpened from "@/public/assets/CampaignRewardOpened.png";
import Close from "@/public/assets/Close.png";
import SparkyIcon from "@/public/assets/SparkyIcon.png";
import SpinIcon from "@/public/assets/SpinIcon.png";
import CustomYellowButton from '@/app/ui/CustomYellowButton';

interface CampaignRewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimClick: () => void;
  campaignSpark: number;
  campaignSpin: number;
}

const CampaignRewardPopup: React.FC<CampaignRewardPopupProps> = ({
  isOpen,
  onClose,
  onClaimClick,
  campaignSpark,
  campaignSpin,
}) => {
  const [isOpened, setIsOpened] = React.useState(false);

  if (!isOpen) return null;

  const handleClick = () => {
    setIsOpened(true);
    onClaimClick();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto ${
          isOpen
            ? "opacity-100"
            : "opacity-0 translate-y-full pointer-events-none"
        }`}
      >
        <div
          className={`w-full relative h-[620px] bg-center bg-no-repeat`}
          style={{
            backgroundImage: `url(${
              isOpened
                ? CampaignRewardOpened.src
                : CampaignRewardClicktoOpen.src
            })`,
            backgroundSize: "contain",
          }}
          onClick={() => !isOpened && handleClick()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white z-10"
          >
            <Image src={Close} alt="Close" width={32} height={32} />
          </button>

          <div className="relative h-full flex flex-col p-12 justify-end space-y-6">
            <div className="jsx-b4b5059c95b17c28 absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
            <div className="flex flex-col items-center z-10">
              {!isOpened ? (
                <></>
              ) : (
                <>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Image
                        src={SparkyIcon}
                        alt="Sparky"
                        width={32}
                        height={32}
                      />
                      <span className="text-white text-xl">
                        +{campaignSpark.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image
                        src={SpinIcon}
                        alt="Spin"
                        width={32}
                        height={32}
                        style={{ objectFit: "contain" }}
                      />
                      <span className="text-white text-xl">
                        +{campaignSpin}
                      </span>
                    </div>
                  </div>

                  <p className="text-[#909090] text-center mb-6 text-sm">
                    You did it! Your prize is already paid out. Enjoy your
                    rewards!
                  </p>

                  <CustomYellowButton
                    onClick={onClose}
                    className="w-[155px] transition-all duration-200 hover:scale-[1.02] hover:opacity-90"
                  >
                   Claim
                  </CustomYellowButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignRewardPopup;