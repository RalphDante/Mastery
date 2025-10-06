import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';

function BossSpawnCountdown() {
  const {partyProfile} = useAuthContext();

  const spawnTime = partyProfile?.nextBossSpawnsAt;
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const spawn = spawnTime.toDate ? spawnTime.toDate() : new Date(spawnTime);
      const diff = spawn - now;

      if (diff <= 0) {
        setTimeRemaining('Spawning soon...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [spawnTime]);

  return (
    <>
      <div className="flex flex-col sm:items-center">
        <span className="text-xs text-blue-100/50">
          Next boss spawns in:
        </span>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-xs md:text-lg font-mono font-bold text-blue-400 whitespace-nowrap">
            {timeRemaining}
          </span>
        </div>
      </div>
    </>
    
  );
}

export default BossSpawnCountdown;