import Button from "../ui/Button";

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="py-20 px-6 text-center">
      <div className="mb-6 text-6xl tracking-[0.2em] text-brand-muted/25" aria-hidden="true">
        --
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 mb-6 max-w-md text-brand-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" className="ui-ripple" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
