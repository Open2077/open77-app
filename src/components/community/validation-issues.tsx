import type { FieldErrors } from "@/lib/account/field-errors";

const labels: Record<string, string> = { slug: "Resource address", title: "Project title", summary: "Short description", category: "Category", description: "About your creation", installation: "Installation", kind: "Project type", maturity: "Development status", tags: "Tags", sourceUrl: "Source repository", issueUrl: "Issue tracker", license: "License", media: "Screenshots", videoUrls: "Video links", version: "Version", changelog: "Changelog", testedBuilds: "Tested Open77 builds", requiredResources: "Required resources", distributionRightsConfirmed: "Distribution permission" };

export function ValidationIssues({ errors }: { errors: FieldErrors }) {
  const issues = Object.entries(errors).flatMap(([field, messages]) => messages.map(message => ({ label: labels[field.replace(/^(content|metadata)\./, "")] ?? "Form details", message })));
  return issues.length ? <div className="hub-notice" role="alert"><p>Check these details before saving:</p><ul>{issues.map((issue, index) => <li key={index}><strong>{issue.label}:</strong> {issue.message}</li>)}</ul></div> : null;
}
