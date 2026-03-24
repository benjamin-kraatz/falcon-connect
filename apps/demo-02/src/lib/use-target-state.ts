import { useCallback, useEffect, useState } from "react";

import {
  defaultTargetState,
  readTargetState,
  type TargetDemoState,
  writeTargetState,
} from "./storage";

export function useTargetDemoState() {
  const [state, setState] = useState<TargetDemoState>(defaultTargetState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readTargetState());
    setReady(true);
  }, []);

  const updateState = useCallback((updater: (current: TargetDemoState) => TargetDemoState) => {
    setState((current) => {
      const next = updater(current);
      writeTargetState(next);
      return next;
    });
  }, []);

  return { ready, state, updateState };
}
