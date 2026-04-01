import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface TeamLogoProps {
  team: string;
  className?: string;
  fallbackColorClass?: string;
}

export function TeamLogo({ team, className, fallbackColorClass }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <div className={cn(
      "relative rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white/10 bg-white",
      className
    )}>
      {imgError || !team ? (
        <span className={cn(
          "absolute inset-0 flex items-center justify-center font-bold tracking-wider uppercase",
          fallbackColorClass || "text-primary bg-primary/20"
        )}>
          {team?.substring(0, 2).toUpperCase() || '?'}
        </span>
      ) : (
        <img 
          src={`${import.meta.env.BASE_URL}img/${team}.png`} 
          alt={team} 
          className="object-contain w-[80%] h-[80%] absolute inset-0 m-auto"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
