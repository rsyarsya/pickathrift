import type { ReactNode } from "react";
import type { AuthFeedbackState } from "../hooks/use-auth-simulation";
import styles from "./auth.module.css";

export function AuthFeedback({
  feedback,
  children,
}: {
  feedback: AuthFeedbackState | null;
  children?: ReactNode;
}) {
  if (!feedback) return null;
  const failed = feedback.kind === "error";
  return (
    <div
      className={`${styles.feedback} ${failed ? styles.feedbackError : styles.feedbackSuccess}`}
      role={failed ? "alert" : "status"}
    >
      <span className={styles.feedbackIcon} aria-hidden="true">
        {failed ? "!" : "✓"}
      </span>
      <div>
        <p>{feedback.message}</p>
        {children}
      </div>
    </div>
  );
}
