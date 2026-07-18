import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "../app/chatgpt-auth";

type ReviewerEnvironment = {
  SKINDEX_REVIEWER_EMAIL?: string;
  THEME_HUB_REVIEWER_EMAIL?: string;
};

function configuredReviewerEmail() {
  const reviewerEnv = env as unknown as ReviewerEnvironment;
  return (reviewerEnv.SKINDEX_REVIEWER_EMAIL ?? reviewerEnv.THEME_HUB_REVIEWER_EMAIL ?? "")
    .trim()
    .toLowerCase();
}

export function isConfiguredReviewer(user: ChatGPTUser) {
  const reviewerEmail = configuredReviewerEmail();
  return reviewerEmail.length > 0 && user.email.trim().toLowerCase() === reviewerEmail;
}

export async function getAuthorizedReviewer() {
  const user = await getChatGPTUser();
  return user && isConfiguredReviewer(user) ? user : null;
}
