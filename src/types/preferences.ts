export type UserPreferences = {
  tabsOcultas?: ("gym" | "entertainment" | "restaurants")[]; // secciones desactivadas
  appName?: string; // nombre de la app para este usuario (default "Agenda")
  taskColors?: Partial<Record<"alta" | "media" | "baja", string>>;
  entertainmentColors?: Partial<Record<"pelis" | "series" | "musica" | "libros" | "recetas", string>>;
  restaurantColors?: Partial<Record<"restaurantes" | "cafes" | "museos" | "ferias" | "bares", string>>;
};
