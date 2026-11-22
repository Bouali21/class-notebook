import { useEffect, useState } from "react";

/** This app's address, once the page is in the browser. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
