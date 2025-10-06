import React from "react";

const FullPageYellowSpinner = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
    <div
      className="rounded-full h-16 w-16 border-t-8 border-b-8 border-[#E18700] border-solid"
      style={{
        animation: "spin 0.4s linear infinite"
      }}
    ></div>
    <style jsx global>{`
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `}</style>
  </div>
);

export default FullPageYellowSpinner; 