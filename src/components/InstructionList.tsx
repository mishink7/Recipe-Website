interface InstructionListProps {
  instructions: string[];
}

export default function InstructionList({ instructions }: InstructionListProps) {
  return (
    <ol className="flex flex-col gap-4">
      {instructions.map((step, i) => (
        <li key={i} className="flex gap-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white text-sm font-semibold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed text-foreground">{step}</p>
        </li>
      ))}
    </ol>
  );
}
