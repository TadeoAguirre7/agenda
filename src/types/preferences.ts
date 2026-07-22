export type UserPreferences = {
  taskColors?: Partial<Record<"alta" | "media" | "baja", string>>;
  entertainmentColors?: Partial<Record<"pelis" | "series" | "musica" | "libros", string>>;
  restaurantColors?: Partial<Record<"restaurantes" | "cafes" | "museos" | "ferias", string>>;
};
