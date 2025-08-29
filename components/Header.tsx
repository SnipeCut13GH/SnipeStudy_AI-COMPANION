
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-background-light shadow-md sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <h1 className="text-xl font-bold text-brand-light flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-9-5.747h18" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.828 8.828a10 10 0 1114.344 0" />
          </svg>
          Snipestudy
        </h1>
      </div>
    </header>
  );
};

export default Header;
