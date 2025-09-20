import React, { useEffect } from "react";
import { saveGameProgress } from "../lib/telegram-api";
import type { TelegramGameState } from "../lib/telegram-server";
import { useGame } from "../context/GameContext";
import { useUser } from "../hooks/useUser";

const GameComponent: React.FC = () => {
  const { gameState } = useGame();
  const { id: userId } = useUser();

  // Periodic updates are now handled by the GameContext debounced save

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (userId) {
        await saveGameProgress(userId.toString(), gameState as unknown as TelegramGameState);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userId, gameState]);

  return <div>Game Component</div>;
};

export default GameComponent;
