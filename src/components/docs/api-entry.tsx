import { Tag } from "@/components/ui/chip";
import { CodeBlock } from "@/components/ui/code-block";
import { Table } from "@/components/ui/data";
import { apiSetLabel, type ApiEntry } from "@/lib/api-reference";
import { highlightCode } from "@/lib/docs";
import { InlineMarkdown } from "./inline-markdown";

import styles from "./api-entry.module.css";

/**
 * One function in the reference.
 *
 * Rendered from the extractor's JSON rather than prose, so the signature,
 * parameter types and defaults cannot drift from the binding they describe. The
 * `inferred` flag is surfaced rather than hidden: a signature the generator
 * guessed from the handler body is a weaker claim than one it read, and a reader
 * deserves to know which they are looking at.
 */
export async function ApiEntryCard({ entry }: { entry: ApiEntry }) {
  const { label, hint } = apiSetLabel(entry.api_set);
  const [signatureHtml, exampleHtml] = await Promise.all([
    highlightCode(entry.signature, "lua"),
    entry.example ? highlightCode(entry.example, "lua") : Promise.resolve(null),
  ]);

  return (
    <article className={styles.entry} id={entry.anchor} data-api-entry>
      <header className={styles.head}>
        <h3 className={styles.name} id={`${entry.anchor}-title`}>
          <a href={`#${entry.anchor}`}>{entry.name}</a>
        </h3>
        <span className={styles.tags}>
          <span title={hint}>
            <Tag tone="neutral">{label}</Tag>
          </span>
          {entry.inferred ? (
            <span title="Signature inferred from the handler body">
              <Tag tone="yellow">Inferred</Tag>
            </span>
          ) : null}
        </span>
      </header>

      <CodeBlock className={styles.signature} code={entry.signature} html={signatureHtml} title="Signature" language="lua" />

      {entry.summary ? (
        <p className={styles.summary}>
          <InlineMarkdown text={entry.summary} />
        </p>
      ) : null}
      {entry.description ? (
        <p className={styles.description}>
          <InlineMarkdown text={entry.description} />
        </p>
      ) : null}

      {entry.params.length > 0 ? (
        <div className={styles.block}>
          <p className={styles.blockTitle}>
            Parameters <span>{entry.params.length}</span>
          </p>
          <Table caption={`Parameters of ${entry.qualified}`} dense className={styles.params}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Use</th>
                <th scope="col">Default</th>
              </tr>
            </thead>
            <tbody>
              {entry.params.map((param) => (
                <tr key={param.name}>
                  <td>
                    <code className={styles.paramName}>{param.name}</code>
                  </td>
                  <td>
                    <code className={styles.paramType}>{param.type}</code>
                  </td>
                  <td className={param.optional ? styles.optional : styles.required}>{param.optional ? "optional" : "required"}</td>
                  <td>{param.default ? <code className={styles.paramType}>{param.default}</code> : <span className={styles.none}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}

      {entry.returns.length > 0 ? (
        <div className={styles.block}>
          <p className={styles.blockTitle}>Returns</p>
          <ul className={styles.returns}>
            {entry.returns.map((value) => (
              <li key={value}>
                <InlineMarkdown text={value} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exampleHtml && entry.example ? (
        <div className={styles.block}>
          <p className={styles.blockTitle}>Example</p>
          <CodeBlock code={entry.example} html={exampleHtml} title="example.lua" language="lua" />
        </div>
      ) : null}

      <p className={styles.source}>
        {entry.usageGuideHref ? (
          <>
            <a href={entry.usageGuideHref}>{entry.usageGuideLabel ?? "Usage guide"}</a>
            {" · "}
          </>
        ) : null}
        {entry.guideHref ? <a href={entry.guideHref}>Documented in {entry.source}</a> : <>Registered in {entry.source} as {entry.handler}</>}
        {entry.source_line ? ` (line ${entry.source_line})` : ""}.
      </p>
    </article>
  );
}
