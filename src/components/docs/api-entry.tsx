import { InlineMarkdown } from "@/components/docs/inline-markdown";
import { apiSetLabel, type ApiEntry } from "@/lib/api-reference";
import { highlightCode } from "@/lib/docs";

const API_SET_CLASS: Record<string, string> = {
  network: "dx-tag dx-tag-network",
  game: "dx-tag dx-tag-game",
};

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
  const exampleHtml = entry.example ? await highlightCode(entry.example, "lua") : null;

  return (
    <article className="dx-fn" id={entry.anchor}>
      <div className="dx-fn-head">
        <h3 className="dx-fn-name" id={`${entry.anchor}-title`}>
          <a href={`#${entry.anchor}`}>{entry.name}</a>
        </h3>
        <span className={API_SET_CLASS[entry.api_set] ?? "dx-tag"} title={hint}>
          {label}
        </span>
        {entry.inferred ? (
          <span className="dx-tag dx-tag-inferred" title="Signature inferred from the handler body">
            INFERRED
          </span>
        ) : null}
      </div>

      <p className="dx-fn-sig">
        <code>{entry.signature}</code>
      </p>

      {entry.summary ? (
        <p className="dx-fn-summary">
          <InlineMarkdown text={entry.summary} />
        </p>
      ) : null}
      {entry.description ? (
        <p className="dx-fn-desc">
          <InlineMarkdown text={entry.description} />
        </p>
      ) : null}

      {entry.params.length > 0 ? (
        <div className="dx-fn-block">
          <p className="dx-fn-block-title">Parameters</p>
          <ul className="dx-params">
            {entry.params.map((param) => (
              <li className="dx-param" key={param.name}>
                <span className="dx-param-name">{param.name}</span>
                <span className="dx-param-type">{param.type}</span>
                <span className={param.optional ? "dx-param-opt" : "dx-param-req"}>
                  {param.optional ? "optional" : "required"}
                </span>
                {param.default ? (
                  <span className="dx-param-type">default {param.default}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {entry.returns.length > 0 ? (
        <div className="dx-fn-block">
          <p className="dx-fn-block-title">Returns</p>
          <ul className="dx-returns">
            {entry.returns.map((value) => (
              <li key={value}>
                <InlineMarkdown text={value} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exampleHtml ? (
        <div className="dx-fn-block">
          <p className="dx-fn-block-title">Example</p>
          <div className="dx-prose" dangerouslySetInnerHTML={{ __html: exampleHtml }} />
        </div>
      ) : null}

      <p className="dx-fn-source">
        Registered in {entry.source} as {entry.handler}
        {entry.source_line ? ` (line ${entry.source_line})` : ""}.
      </p>
    </article>
  );
}
