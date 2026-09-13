export function hubReadFailure(status?: number) {
  if (status === 401 || status === 403) return {
    label: "ACCESS DENIED", title: "This content is not publicly accessible.",
    description: "You do not have access to this content. You can explore other public creations.", retry: false,
  };
  if (status === 410) return {
    label: "CONTENT REMOVED", title: "This content has been removed.",
    description: "It is no longer available on the Workshop. You can explore other public creations.", retry: false,
  };
  if (status === 404) return {
    label: "CONTENT NOT FOUND", title: "We couldn’t find this content.",
    description: "Check the link or explore the public resource library.", retry: false,
  };
  if (status === undefined || status === 408 || status === 429 || (status >= 500 && status <= 599)) return {
    label: "TEMPORARILY UNAVAILABLE", title: "We couldn’t load this content right now.",
    description: status === 429 ? "Too many requests. Please wait a moment before trying again." : "Please try again shortly.", retry: true,
  };
  return {
    label: "REQUEST UNAVAILABLE", title: "This content could not be loaded.",
    description: "Check the link or explore other public creations.", retry: false,
  };
}
