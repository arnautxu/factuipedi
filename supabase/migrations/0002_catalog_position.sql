-- Afegeix un ordre manual als ítems del catàleg (per poder reordenar-los des de l'app)
alter table catalog_items add column if not exists position integer;

-- Omple la posició inicial seguint l'ordre alfabètic actual per codi
with ordered as (
  select id, row_number() over (order by code) as rn
  from catalog_items
)
update catalog_items
set position = ordered.rn
from ordered
where catalog_items.id = ordered.id
  and catalog_items.position is null;

alter table catalog_items alter column position set not null;
alter table catalog_items alter column position set default 0;
create index if not exists idx_catalog_items_position on catalog_items(position);
