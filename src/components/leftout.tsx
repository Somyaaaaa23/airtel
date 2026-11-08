/** "Left out and why": every product the rules engine excluded, with its reason codes in plain words. Always shown. */
import { blockText, pName } from "../advisor/explain";
import type { Recommendation } from "../engine/types";
import { t, type Lang } from "../i18n/strings";

export function LeftOut({ rec, lang }: { rec: Recommendation; lang: Lang }) {
  const none = rec.blocked.length === 0;
  return (
    <section className={`leftout ${none ? "none" : ""}`} aria-label={t(lang, "lo_title")}>
      <strong>{t(lang, "lo_title")}</strong>
      {none ? <p>{t(lang, "lo_none")}</p> : (
        <ul>
          {rec.blocked.map((b) => (
            <li key={b.productId}>
              <b>{pName(b.productId)}</b>
              <span>{b.blocks.map((x) => blockText(x, lang)).join("; ")}{b.alternative ? `. ${t(lang, "insteadAdded", { product: pName(b.alternative) })}` : ""}</span>
              <span className="codes">{b.blocks.map((x) => <code key={x.code}>{x.code}</code>)}</span>
            </li>
          ))}
        </ul>
      )}
      {rec.blocked.some((b) => b.blocks.some((x) => x.code === "gstin")) && <p className="fine">{t(lang, "gstTip")}</p>}
    </section>
  );
}
