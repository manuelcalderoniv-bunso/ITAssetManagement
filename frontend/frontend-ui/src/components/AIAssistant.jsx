import { useEffect, useMemo, useState } from "react";
import { describeAsset, answer, knowledgeCount } from "../lib/assetKnowledge";

export default function AiAssistant({ asset }) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(knowledgeCount());
  }, [asset]);

  const info = useMemo(() => describeAsset(asset), [asset]);

  const ask = () => {
    const result = answer(question, window.__itamsAssets ?? []);
    setReply(result ?? "Ask something about the register.");
    setQuestion("");
  };

  return (
    <aside className="ai-panel">
      <div className="ai-head">
        <span className="ai-dot" />
        <strong>Asset Assistant</strong>
      </div>

      <div className="ai-body">
        {!asset ? (
          <p className="ai-hint">
            Select an asset from the table to see its background here.
          </p>
        ) : (
          <>
            <div className="ai-title">{info?.title}</div>
            <div className="ai-sub">
              {asset.assetTag} - {asset.category} - {asset.status}
            </div>

            <dl className="ai-facts">
              <div>
                <dt>Custodian</dt>
                <dd>{asset.assignedTo ?? asset.department ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{asset.location ?? "-"}</dd>
              </div>
              <div>
                <dt>Serial</dt>
                <dd>{asset.serialNumber ?? "-"}</dd>
              </div>
              <div>
                <dt>Purchased</dt>
                <dd>{asset.purchaseDate ?? "-"}</dd>
              </div>
              <div>
                <dt>Warranty ends</dt>
                <dd>{asset.warrantyEnd ?? "-"}</dd>
              </div>
            </dl>

            {info?.lines?.length ? (
              <ul className="ai-lines">
                {info.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="ai-chat">
        <div className="ai-chat-log">
          {reply ? <div className="ai-bubble">{reply}</div> : null}
        </div>
        <div className="ai-chat-input">
          <input
            placeholder="Ask about the inventory..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
          />
          <button className="btn-mini" onClick={ask}>
            Ask
          </button>
        </div>
        <div className="ai-foot">
          Local knowledge engine - {count} model{count === 1 ? "" : "s"} learned
        </div>
      </div>
    </aside>
  );
}
