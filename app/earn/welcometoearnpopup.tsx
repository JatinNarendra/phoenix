import React from 'react'
import Image from 'next/image'
import ContinueButton from "../../public/assets/Earn/ContinueButton.png"
import WelcomeToEarnIcon from "../../public/assets/Earn/WelcomeToEarnIcon.png"

const WelcomeToEarnPopup = () => {
  return (
    <div className="relative h-[456px] w-full text-center font-rounded-mplus">
      <div className="absolute inset-0 rounded-t-[10px] border border-white/10 bg-[#291818] backdrop-blur-[14px]" />
      
      <div className="absolute left-1/2 top-[181px] flex w-[277px] -translate-x-1/2 flex-col items-center gap-10">
        <div className="flex w-full flex-col items-center gap-4">
          <Image 
            src={WelcomeToEarnIcon} 
            alt="Welcome to Earn"
            width={120}
            height={120}
          />
          <b className="inline-block w-[329px] text-[28px] leading-[140%] tracking-[-0.02em] text-[#E18700]">
            Welcome to Earn
          </b>
          <p className="inline-block w-[329px] text-base leading-[140%] tracking-[-0.02em] text-white/60">
            I accept Sparky doesn&apos;t take responsibility for sponsored content.
          </p>
        </div>

        <button className="relative h-[46px] w-[155px]">
          <Image
            src={ContinueButton}
            alt="Continue"
            fill
            className="object-contain"
          />
        </button>
      </div>
    </div>
  )
}

export default WelcomeToEarnPopup