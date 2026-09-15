import { useEffect, useState } from "react";

export function Notice({ message, error }) {
  const content = error || message;
  const noticeKey = `${error ? "error" : "message"}:${content || ""}`;
  const [dismissedKey, setDismissedKey] = useState("");

  useEffect(() => {
    if (!content) return undefined;

    const resetTimer = setTimeout(() => {
      setDismissedKey("");
    }, 0);
    const timer = setTimeout(() => {
      setDismissedKey(noticeKey);
    }, 5000);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(timer);
    };
  }, [content, noticeKey]);

  if (!content || dismissedKey === noticeKey) return null;

  return (
    <div className={error ? "notice error" : "notice"}>
      {error || message}
    </div>
  );
}
