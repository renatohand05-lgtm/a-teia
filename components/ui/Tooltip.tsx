export function Tooltip({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <span className="teia-tooltip">
      <button type="button" className="teia-tooltip-btn" aria-label={label} title={text}>
        ?
      </button>
      <span role="tooltip" className="teia-tooltip-panel">
        {text}
      </span>
    </span>
  );
}
