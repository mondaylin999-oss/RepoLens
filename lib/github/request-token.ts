const GITHUB_TOKEN_HEADER = "x-github-token";
const TOKEN_PATTERN = /^[A-Za-z0-9_]{20,255}$/;

export function readGitHubToken(request: Request): { token?: string; invalid: boolean } {
  const value = request.headers.get(GITHUB_TOKEN_HEADER)?.trim() ?? "";
  if (!value) return { invalid: false };
  if (!TOKEN_PATTERN.test(value)) return { invalid: true };
  return { token: value, invalid: false };
}

export function githubTokenHeader(token: string): HeadersInit | undefined {
  return token ? { [GITHUB_TOKEN_HEADER]: token } : undefined;
}
