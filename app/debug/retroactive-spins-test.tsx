"use client";

import React, { useState } from 'react';
import { calculateRetroactiveSpins } from '../utility/spinUtils';

const RetroactiveSpinsTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    scenario: string;
    lastActiveTime: number;
    currentSpins: number;
    result: ReturnType<typeof calculateRetroactiveSpins>;
  }>>([]);

  const runTests = () => {
    const now = Date.now();
    const scenarios = [
      {
        scenario: "User away for 5 minutes with 10 spins",
        lastActiveTime: now - (5 * 60 * 1000), // 5 minutes ago
        currentSpins: 10
      },
      {
        scenario: "User away for 30 minutes with 0 spins",
        lastActiveTime: now - (30 * 60 * 1000), // 30 minutes ago
        currentSpins: 0
      },
      {
        scenario: "User away for 1 hour with 20 spins",
        lastActiveTime: now - (60 * 60 * 1000), // 1 hour ago
        currentSpins: 20
      },
      {
        scenario: "User away for 2 hours with 0 spins (should cap at 50)",
        lastActiveTime: now - (2 * 60 * 60 * 1000), // 2 hours ago
        currentSpins: 0
      },
      {
        scenario: "User already has 50 spins",
        lastActiveTime: now - (30 * 60 * 1000), // 30 minutes ago
        currentSpins: 50
      },
      {
        scenario: "User away for 30 seconds (should get 0 spins)",
        lastActiveTime: now - (30 * 1000), // 30 seconds ago
        currentSpins: 10
      },
      {
        scenario: "User away for 25 minutes with 40 spins (should cap at 50)",
        lastActiveTime: now - (25 * 60 * 1000), // 25 minutes ago
        currentSpins: 40
      }
    ];

    const results = scenarios.map(scenario => ({
      ...scenario,
      result: calculateRetroactiveSpins(scenario.lastActiveTime, scenario.currentSpins)
    }));

    setTestResults(results);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Retroactive Spins Test</h1>
      
      <button
        onClick={runTests}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-6"
      >
        Run Tests
      </button>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results:</h2>
          {testResults.map((test, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded">
              <h3 className="font-semibold text-lg mb-2">{test.scenario}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Last Active:</strong> {formatTime(test.lastActiveTime)}</p>
                  <p><strong>Current Spins:</strong> {test.currentSpins}</p>
                  <p><strong>Minutes Away:</strong> {test.result.minutesAway}</p>
                </div>
                <div>
                  <p><strong>Spins to Add:</strong> {test.result.spinsToAdd}</p>
                  <p><strong>Final Spins:</strong> {test.currentSpins + test.result.spinsToAdd}</p>
                </div>
              </div>
              <p className="mt-2 text-gray-300 text-sm">
                <strong>Explanation:</strong> {test.result.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gray-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">How it works:</h2>
        <ul className="text-sm space-y-1 text-gray-300">
          <li>• Users get 2 spins per minute they were away</li>
          <li>• Maximum spins is capped at 50</li>
          <li>• Must be away for at least 1 minute to earn spins</li>
          <li>• Only applies if user has less than 50 spins</li>
          <li>• Last active time is updated when user performs actions</li>
        </ul>
      </div>
    </div>
  );
};

export default RetroactiveSpinsTest; 