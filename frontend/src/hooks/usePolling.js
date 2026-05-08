import { useEffect } from "react";

export function usePolling(callback, delay, deps = []) {
  useEffect(() => {
    callback();
    const id = window.setInterval(callback, delay);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
