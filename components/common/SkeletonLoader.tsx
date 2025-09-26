import React from 'react';

export const SkeletonLoader: React.FC = () => (
    <div className="flex items-start gap-3 my-4 animate-pulse">
        <div className="w-7 h-7 rounded-full bg-chat-model flex-shrink-0"></div>
        <div className="rounded-xl px-4 py-3 max-w-2xl bg-chat-model">
            <div className="space-y-2">
                <div className="h-4 bg-background-light rounded w-48"></div>
                <div className="h-4 bg-background-light rounded w-32"></div>
            </div>
        </div>
    </div>
);