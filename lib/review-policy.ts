export const PENDING_REVIEW_STATUS = "pending" as const;
export const APPROVED_THEME_STATUS = "approved" as const;
export const REVIEW_REQUIRED_PUBLICATION = "review-required" as const;

export function pendingReviewResult(id: string, consentAt?: string) {
  return {
    id,
    status: PENDING_REVIEW_STATUS,
    public: false,
    publication: REVIEW_REQUIRED_PUBLICATION,
    ...(consentAt ? { consentAt } : {}),
  };
}

export function isPublicThemeStatus(status: string) {
  return status === APPROVED_THEME_STATUS;
}
