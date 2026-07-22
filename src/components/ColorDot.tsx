"use client";

export type UserPreferences = {
  taskColors?: Partial<Record<"alta" | "media" | "baja", string>>;
  entertainmentColors?: Partial<Record<"pelis" | "series" | "musica" | "libros", string>>;
  restaurantColors?: Partial<Record<"restaurantes" | "cafes" | "museos" | "ferias", string>>;
};

export default function ColorDot({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <label
      className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-ink/20 transition hover:scale-110"
      style={{ background: color }}
      title={`Cambiar color: ${label}`}
    >
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label={`Color de ${label}`}
      />
    </label>
  );
}
