import React from 'react';
import { User } from '../../types.ts';
import { Tooltip } from '../common/Tooltip';

interface UserPresenceProps {
  currentUser: User;
  otherUsers: User[];
}

export const UserPresence: React.FC<UserPresenceProps> = ({ currentUser, otherUsers }) => {
  const displayedUsers = [...otherUsers, currentUser].slice(0, 4);
  const hiddenCount = Math.max(0, otherUsers.length + 1 - 4);

  return (
    <div className="flex items-center -space-x-2">
      {displayedUsers.map(user => (
        <Tooltip key={user.id} content={user.name}>
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full border-2 border-surface ring-2 ring-transparent hover:ring-brand-primary transition-all"
          />
        </Tooltip>
      ))}
      {hiddenCount > 0 && (
        <div className="w-8 h-8 rounded-full bg-overlay border-2 border-surface flex items-center justify-center text-xs font-semibold text-text-secondary">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};
