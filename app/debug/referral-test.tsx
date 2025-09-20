"use client";

import React, { useState } from 'react';
import { Button } from '@/app/ui/button';
import { Input } from '@/app/ui/input';

// Define an interface for the API response
interface ReferralDebugResponse {
  userData?: {
    user_id: string;
    game_state: Record<string, unknown>;
  };
  pendingReferrals?: Array<{
    id: number;
    referee_id: string;
    reward_amount: number;
    reward_claimed: boolean;
    telegram_users?: {
      first_name: string;
    };
  }>;
  pendingRewardsAmount?: number;
  allReferrals?: Array<Record<string, unknown>>;
  stats?: {
    total_referrals?: number;
    total_rewards?: number;
    claimed_rewards?: number;
    claimed_reward_amount?: number;
  };
  testDataCreated?: boolean;
  debug?: {
    shouldShowClaimUI?: boolean;
  };
  error?: string;
}

export default function ReferralTestPage() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<ReferralDebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleCheck = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/referrals?userId=${userId}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      setResult({ error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTestData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/referrals?userId=${userId}&createTest=true`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error creating test data:', error);
      setResult({ error: 'Failed to create test data' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Referral Debug Tool</h1>
      
      <div className="flex gap-2 mb-4">
        <Input 
          placeholder="Enter user ID" 
          value={userId} 
          onChange={(e) => setUserId(e.target.value)}
        />
        <Button onClick={handleCheck} disabled={loading}>Check Referrals</Button>
        <Button onClick={handleCreateTestData} disabled={loading}>Create Test Data</Button>
      </div>
      
      {loading && <div>Loading...</div>}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          
          <div className="p-4 border rounded mb-4 bg-gray-50">
            <h3 className="font-bold">Should Show Claim UI? {result.debug?.shouldShowClaimUI ? '✅' : '❌'}</h3>
            <p className="font-semibold">Pending Reward Amount: {result.pendingRewardsAmount || 0}</p>
            {result.testDataCreated && (
              <p className="text-green-600 font-bold">Test data created successfully!</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">User Data</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-60">
                {JSON.stringify(result.userData, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Stats</h3>
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-60">
                {JSON.stringify(result.stats, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Pending Referrals ({result.pendingReferrals?.length || 0})</h3>
            <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-60">
              {JSON.stringify(result.pendingReferrals, null, 2)}
            </pre>
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">All Referrals ({result.allReferrals?.length || 0})</h3>
            <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-60">
              {JSON.stringify(result.allReferrals, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 