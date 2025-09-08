import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    
    // Support for modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Deprecated but needed for some older browsers
      media.addListener(listener);
    }
    
    // Initial check
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
};
