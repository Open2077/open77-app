import { Notice } from "@/components/ui/feedback";
import type { FieldErrors } from "@/lib/account/field-errors";

import styles from "./validation-issues.module.css";

const labels: Record<string, string> = { slug: "Resource address", title: "Project title", summary: "Short description", category: "Category", description: "About your creation", installation: "Installation", kind: "Project type", maturity: "Development status", tags: "Tags", sourceUrl: "Source repository", issueUrl: "Issue tracker", license: "License", media: "Screenshots", videoUrls: "Video links", version: "Version", changelog: "Changelog", testedBuilds: "Tested Open77 builds", requiredResources: "Required resources", distributionRightsConfirmed: "Distribution permission" };

/** The master's message for one field, whether it keys it bare or under `content.` / `metadata.`. */
export function fieldIssue(errors: FieldErrors, name: string): string | undefined {
  for (const key of [name, `content.${name}`, `metadata.${name}`]) {
    const messages = errors[key];
    if (messages?.length) return messages.join(" ");
  }
  return undefined;
}

/** Every field-level problem the master reported, as one summary above the form. */
export function ValidationIssues({ errors }: { errors: FieldErrors }) {
  const issues = Object.entries(errors).flatMap(([field, messages]) => messages.map(message => ({ label: labels[field.replace(/^(content|metadata)\./, "")] ?? "Form details", message })));
  return issues.length ? (
    <Notice kind="danger" title="Check these details before saving:">
      <ul className={styles.list}>
        {issues.map((issue, index) => (
          <li key={index}>
            <strong>{issue.label}:</strong> {issue.message}
          </li>
        ))}
      </ul>
    </Notice>
  ) : null;
}
