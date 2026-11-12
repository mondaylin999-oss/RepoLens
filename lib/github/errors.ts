import type { AnalysisErrorCode } from "@/lib/types";

/** Error with a user-safe message. Anything else thrown is treated as an internal error. */
export class GitHubError extends Error {
  constructor(
    public readonly code: AnalysisErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryAt?: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export const HTTP_STATUS: Record<AnalysisErrorCode, number> = {
  INVALID_URL: 400,
  NOT_FOUND: 404,
  INACCESSIBLE: 403,
  EMPTY_REPOSITORY: 422,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  NETWORK_ERROR: 502,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};
