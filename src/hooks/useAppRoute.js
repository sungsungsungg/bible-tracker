import { useEffect, useState } from 'react';

function getCurrentRoute() {
  if (window.location.pathname === '/calendar') return '/calendar';
  if (window.location.pathname === '/notes') return '/notes';
  return '/';
}

export function useAppRoute() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function syncRoute() {
      setRoute(getCurrentRoute());
    }

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  function navigate(event, destination) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (destination === route) return;
    window.history.pushState({}, '', destination);
    setRoute(destination);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return { route, navigate };
}
