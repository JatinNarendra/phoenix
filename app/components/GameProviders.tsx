'use client';

import React from 'react';
import { GameProvider } from '../context/GameContext';
import { GameFeaturesProvider } from '../context/GameFeaturesContext';
import { WebAppProvider } from '../context/WebAppContext';
import { LevelUpProvider } from '../context/LevelUpContext';
import { ReferralProvider } from '../context/ReferralContext';
import { ProgressionProvider } from '../context/ProgressionContext';
import ErrorBoundary from './ErrorBoundary';

export default function GameProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <WebAppProvider>
        <LevelUpProvider>
          <GameProvider>
            <GameFeaturesProvider>
              <ProgressionProvider>
                <ReferralProvider>
                  {children}
                </ReferralProvider>
              </ProgressionProvider>
            </GameFeaturesProvider>
          </GameProvider>
        </LevelUpProvider>
      </WebAppProvider>
    </ErrorBoundary>
  );
}
