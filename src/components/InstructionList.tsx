interface InstructionListProps {
  instructions: string[];
}

const HEADER_PREFIX = "## ";

export default function InstructionList({ instructions }: InstructionListProps) {
  // Pre-compute step numbers, skipping over header entries so the numbering
  // stays continuous across section breaks.
  let stepNum = 0;
  const items = instructions.map((entry) => {
    if (entry.startsWith(HEADER_PREFIX)) {
      return { type: "header" as const, text: entry.slice(HEADER_PREFIX.length) };
    }
    stepNum += 1;
    return { type: "step" as const, text: entry, number: stepNum };
  });

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) =>
        item.type === "header" ? (
          <li
            key={i}
            className="text-xs font-semibold text-muted uppercase tracking-wider mt-2 first:mt-0"
          >
            {item.text}
          </li>
        ) : (
          <li key={i} className="flex gap-4">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white text-sm font-semibold flex items-center justify-center mt-0.5">
              {item.number}
            </span>
            <p className="text-sm leading-relaxed text-foreground">{item.text}</p>
          </li>
        )
      )}
    </ol>
  );
}
