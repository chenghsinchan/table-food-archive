"use client";

import { useEffect, useState } from "react";
import { Onboarding, hasSeenOnboarding } from "@/components/onboarding/Onboarding";

/**
 * Shows the one-time walkthrough over the app on first open. Rendered only
 * after mount so server and client markup match (localStorage is read on the
 * client). Once done or skipped it never returns for this browser.
 */
export function OnboardingHost() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setShow(true);
    }
  }, []);

  if (!show) {
    return null;
  }

  return <Onboarding onDone={() => setShow(false)} />;
}
