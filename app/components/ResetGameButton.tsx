"use client";
import React from "react";
import { useGame } from "../context/GameContext";
import { Button } from '@/app/ui/button';

export default function ResetGameButton() {
  const { resetGame, forceRefreshFromDatabase } = useGame();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your game progress? This cannot be undone!')) {
      resetGame();
    }
  };

  const handleRefreshFromDB = () => {
    forceRefreshFromDatabase();
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button 
        variant="destructive" 
        onClick={handleReset}
        className="w-full"
      >
        Reset Game
      </Button>
      <Button 
        variant="outline" 
        onClick={handleRefreshFromDB}
        className="w-full"
      >
        Refresh from DB
      </Button>
      <p className="text-xs text-gray-500 mt-1">
        Use &quot;Refresh from DB&quot; if your game state is out of sync with the database.
      </p>
    </div>
  );
}
