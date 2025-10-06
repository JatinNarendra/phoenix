import "./globals.css";
import "./styles/toast.css";
import { M_PLUS_Rounded_1c } from "next/font/google";
import Script from "next/script";
import ConditionalLayout from "./components/ConditionalLayout";
import { Metadata } from "next";

const mplus = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-mplus",
});

export const metadata: Metadata = {
  title: "Phoenix Game",
  description: "Phoenix Game App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mplus.variable} suppressHydrationWarning={true}>
      <head>
        <Script
          id="telegram-web-app-script"
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          id="context-menu-prevention"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent context menu on long press in Telegram WebApp
              (function() {
                function preventContextMenu() {
                  // Check if we're in a Telegram WebApp
                  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.isTelegramApp) {
                    // Add oncontextmenu="return false;" to body element
                    document.body.setAttribute('oncontextmenu', 'return false;');
                    
                    // Add more aggressive prevention
                    const preventAll = function(e) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    };
                    
                    // Prevent context menu on multiple event types
                    document.addEventListener('contextmenu', preventAll, { capture: true });
                    document.addEventListener('selectstart', preventAll, { capture: true });
                    document.addEventListener('dragstart', preventAll, { capture: true });
                    
                    // Prevent multi-touch gestures that might trigger context menu
                    const preventMultiTouch = function(e) {
                      if (e.touches && e.touches.length > 1) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    };
                    
                    document.addEventListener('touchstart', preventMultiTouch, { capture: true, passive: false });
                    document.addEventListener('touchend', preventMultiTouch, { capture: true, passive: false });
                    
                    // Add CSS to prevent selection and context menu
                    const style = document.createElement('style');
                    style.textContent = \`
                      * {
                        -webkit-touch-callout: none !important;
                        -webkit-user-select: none !important;
                        -khtml-user-select: none !important;
                        -moz-user-select: none !important;
                        -ms-user-select: none !important;
                        user-select: none !important;
                        -webkit-user-drag: none !important;
                        -khtml-user-drag: none !important;
                        -moz-user-drag: none !important;
                        -o-user-drag: none !important;
                        user-drag: none !important;
                      }
                    \`;
                    document.head.appendChild(style);
                    
                    console.log('Enhanced context menu prevention enabled for Telegram WebApp');
                  }
                }
                
                // Try immediately
                preventContextMenu();
                
                // Also try when DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', preventContextMenu);
                }
                
                // Fallback: try after a short delay
                setTimeout(preventContextMenu, 100);
              })();
            `,
          }}
        />
      </head>
      <body
        data-theme="light"
        className={`${mplus.className} font-rounded-mplus`}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
