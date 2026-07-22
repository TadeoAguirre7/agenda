-- Renombrar las categorías de Lugares: bares -> museos, dulces -> ferias
UPDATE "RestaurantItem" SET categoria = 'museos' WHERE categoria = 'bares';
UPDATE "RestaurantItem" SET categoria = 'ferias' WHERE categoria = 'dulces';
