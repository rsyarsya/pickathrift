import { useEffect, useState } from "react";
import { paymentSeconds, type Order } from "./order";

export function usePaymentCountdown(order: Order) {
  const [now, setNow] = useState(Date.now);
  const seconds = paymentSeconds(order, now);
  const ticking = seconds !== null && seconds > 0;

  useEffect(() => {
    if (!ticking) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [ticking]);

  return seconds;
}
