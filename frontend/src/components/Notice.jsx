import { useEffect, useState } from "react";

export function Notice({ message, error }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message && !error) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, error]);

  if (!visible) return null;

  return (
    <div className={error ? "notice error" : "notice"}>
      {error || message}
    </div>
  );
}