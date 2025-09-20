"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useGame } from "../../context/GameContext";
import { Button } from "@/app/ui/button";
import { Card } from "@/app/ui/card";
import { supabase } from "../../lib/supabase";
import { useUser } from "../../hooks/useUser";
import { GameState } from "@/app/types/GameState";

export default function GameStateDebugPage() {
  const { gameState, forceRefreshFromDatabase } = useGame();
  const [dbState, setDbState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { id: user_id } = useUser();

  const fetchDbState = useCallback(async () => {
    if (!user_id) {
      console.error("No user ID available");
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("telegram_users")
        .select("game_state")
        .eq("user_id", user_id.toString())
        .single();

      if (error) {
        console.error("Error fetching database state:", error);
      } else {
        setDbState(data?.game_state || null);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error("Exception fetching database state:", error);
    } finally {
      setLoading(false);
    }
  }, [user_id]);

  const handleRefreshFromDB = async () => {
    await forceRefreshFromDatabase();
    fetchDbState();
  };

  useEffect(() => {
    fetchDbState();
  }, [fetchDbState]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Game State Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Actions</h2>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRefreshFromDB}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh from Database"}
            </Button>
            <Button
              onClick={fetchDbState}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Loading..." : "View Database State"}
            </Button>
            {lastRefreshed && (
              <p className="text-xs text-gray-500 mt-1">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">
            Current Game State Summary
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="font-semibold">User ID:</div>
            <div>{gameState.user_id}</div>

            <div className="font-semibold">Coins:</div>
            <div>{gameState.coins}</div>

            <div className="font-semibold">Spins:</div>
            <div>{gameState.spins}</div>

            <div className="font-semibold">Level:</div>
            <div>{gameState.level}</div>

            <div className="font-semibold">Last Update:</div>
            <div>{new Date(gameState.lastUpdate).toLocaleString()}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">
            Current Game State (Memory)
          </h2>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </Card>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Database State</h2>
          {dbState ? (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(dbState, null, 2)}
            </pre>
          ) : (
            <p>No database state loaded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
