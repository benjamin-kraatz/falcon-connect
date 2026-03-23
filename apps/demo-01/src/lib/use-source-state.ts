import { useCallback, useEffect, useState } from "react";

import {
  defaultSourceDemoState,
  readSourceDemoState,
  type SourceDemoState,
  writeSourceDemoState,
} from "./storage";

export function useSourceDemoState() {
  const [state, setState] = useState<SourceDemoState>(defaultSourceDemoState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readSourceDemoState());
    setReady(true);
  }, []);

  const updateState = useCallback((updater: (current: SourceDemoState) => SourceDemoState) => {
    setState((current) => {
      const next = updater(current);
      writeSourceDemoState(next);
      return next;
    });
  }, []);

  return { ready, state, updateState };
}
