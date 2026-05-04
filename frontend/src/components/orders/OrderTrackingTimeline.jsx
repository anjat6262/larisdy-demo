import { formatOrderDate } from "../../utils/date";

function OrderTrackingTimeline({ timeline = [] }) {
  return (
    <ol className="grid gap-4">
      {timeline.map((step, index) => (
        <li
          key={step.key ?? index}
          className={`grid grid-cols-[2.5rem_1fr] gap-4 rounded-xl border p-4 ${
            step.is_current
              ? "border-brand-gold bg-brand-cream"
              : step.is_completed
                ? "border-green-200 bg-green-50"
                : "border-brand-border bg-white"
          }`}
        >
          <span
            className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${
              step.is_completed
                ? "bg-brand-black text-brand-gold"
                : "bg-brand-cream text-brand-muted"
            }`}
          >
            {step.is_completed ? "OK" : index + 1}
          </span>
          <span>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-brand-black">{step.label}</strong>
              {step.is_current ? (
                <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold uppercase text-brand-black">
                  Saat Ini
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-sm leading-6 text-brand-muted">{step.description}</span>
            {step.date ? (
              <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-brand-muted">
                {formatOrderDate(step.date)}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default OrderTrackingTimeline;
