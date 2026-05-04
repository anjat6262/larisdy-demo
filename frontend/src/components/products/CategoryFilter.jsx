function CategoryFilter({ categories, selectedCategory, onSelect }) {
  return (
    <div className="my-8 flex flex-wrap gap-3">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:border-brand-gold hover:bg-brand-cream hover:text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
            selectedCategory === category
              ? "border-brand-black bg-brand-black text-white"
              : "border-brand-border bg-white text-brand-muted"
          }`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;
