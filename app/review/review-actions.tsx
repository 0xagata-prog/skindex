"use client";

import { useState } from "react";

type ReviewKind = "submission" | "proposal";
type ReviewAction = "approve" | "reject";

export function ReviewActions({ kind, id, engine }: { kind: ReviewKind; id: string; engine?: string }) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  const review = async (action: ReviewAction) => {
    const label = action === "approve"
      ? kind === "proposal" && engine === "skindex-native" ? "通过并发布这个轻量配色" : "接受并进入人工编目"
      : "拒绝这条投稿";
    if (!window.confirm(`确认${label}？`)) return;

    setState("working");
    setMessage("");
    try {
      const response = await fetch(`/api/review/${kind}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "审核操作失败");
      window.location.reload();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "审核操作失败");
    }
  };

  return (
    <div className="review-actions">
      <button className="approve" disabled={state === "working"} onClick={() => review("approve")}>
        {kind === "proposal" && engine === "skindex-native" ? "通过并发布" : "接受并进入编目"}
      </button>
      <button className="reject" disabled={state === "working"} onClick={() => review("reject")}>拒绝</button>
      {state === "error" && <p role="alert">{message}</p>}
    </div>
  );
}
