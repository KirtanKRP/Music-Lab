-- Seed baseline records used by local/demo flows.
-- This migration is idempotent and safe for pre-seeded databases.

insert into users (username, email, password_hash, wallet_balance)
select 'TestProducer', 'test@musiclab.com', 'hashed_placeholder', 5000.00
where not exists (
    select 1
    from users
    where email = 'test@musiclab.com'
);

insert into market_tracks (project_id, seller_id, title, base_price, listed_at)
select null, u.id, 'Lofi Study Beat', 29.99, now()
from users u
where u.email = 'test@musiclab.com'
  and not exists (
      select 1
      from market_tracks mt
      where mt.seller_id = u.id
        and mt.title = 'Lofi Study Beat'
  );

insert into market_tracks (project_id, seller_id, title, base_price, listed_at)
select null, u.id, 'Cyberpunk Synthwave', 45.50, now()
from users u
where u.email = 'test@musiclab.com'
  and not exists (
      select 1
      from market_tracks mt
      where mt.seller_id = u.id
        and mt.title = 'Cyberpunk Synthwave'
  );

insert into market_tracks (project_id, seller_id, title, base_price, listed_at)
select null, u.id, 'Acoustic Guitar Loop', 15.00, now()
from users u
where u.email = 'test@musiclab.com'
  and not exists (
      select 1
      from market_tracks mt
      where mt.seller_id = u.id
        and mt.title = 'Acoustic Guitar Loop'
  );
