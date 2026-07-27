import { useEffect } from 'react';
import { useAppCommandStore, type AppCommands } from '../stores/appCommandStore';

/**
 * Publish this window's menu commands.
 *
 * Pass a memoised object — a fresh one every render would republish on every
 * render, and the menu bar subscribes to the store. (A zustand selector that
 * builds a new value each render is what took the whole shell down once
 * before; the same care applies on the writing side.)
 *
 *   useAppCommands(windowId, useMemo(() => ({
 *     back: canBack ? goBack : undefined,
 *     home: () => navigate(home),
 *   }), [canBack, goBack, navigate, home]));
 *
 * Omit a key, or give it undefined, and the menu greys that item.
 */
export const useAppCommands = (windowId: string, commands: AppCommands) => {
  const publish = useAppCommandStore((s) => s.publish);
  const withdraw = useAppCommandStore((s) => s.withdraw);

  useEffect(() => {
    publish(windowId, commands);
  }, [windowId, commands, publish]);

  // Closing the window must take its commands with it, or the menu keeps
  // offering to navigate a Finder that is no longer on screen.
  useEffect(() => () => withdraw(windowId), [windowId, withdraw]);
};
