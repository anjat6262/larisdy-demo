function ProductRating({ summary, className = "" }) {
  const reviewCount = Number(summary?.count ?? 0);
  const averageRating = Number(summary?.average_rating);
  const hasRating = reviewCount > 0 && Number.isFinite(averageRating);

  if (!hasRating) {
    return (
      <p className={`text-sm font-semibold text-brand-muted ${className}`.trim()}>
        Belum ada rating
      </p>
    );
  }

  const filledStars = Math.round(averageRating);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-sm ${className}`.trim()}
      title={`Rating ${averageRating.toFixed(1)} dari 5 berdasarkan ${reviewCount} review`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={`rating-star-${index}`}
            className={index < filledStars ? "text-brand-gold" : "text-slate-300"}
          >
            ★
          </span>
        ))}
      </span>
      <span className="font-bold text-brand-black">{averageRating.toFixed(1)}/5</span>
      <span className="text-brand-muted">({reviewCount} review)</span>
    </div>
  );
}

export default ProductRating;
