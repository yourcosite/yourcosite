export default function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="2" y="4" width="28" height="18" rx="7" fill="#C6FF5E" />
        <path d="M10 22 L10 29 L17 22 Z" fill="#C6FF5E" />
        <circle cx="11" cy="13" r="1.6" fill="#0C1004" />
        <circle cx="16" cy="13" r="1.6" fill="#0C1004" />
        <circle cx="21" cy="13" r="1.6" fill="#0C1004" />
      </svg>
      <span
        className={`font-serif font-semibold text-[19px] ${
          light ? "text-white" : "text-ink"
        }`}
      >
        YourCoSite
      </span>
    </span>
  );
}
