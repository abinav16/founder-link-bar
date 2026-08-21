UPDATE public.bids
   SET status = 'paid',
       paid_at = COALESCE(paid_at, now()),
       entry_id = '2bd75889-2534-4cbe-9111-813d3ca367e2'
 WHERE id = '79a968fa-d95f-4a90-abef-ab5677cb6160'
   AND status = 'pending';

UPDATE public.bids SET status = 'failed'
 WHERE id = '0c205650-a9e2-47c8-a52a-807cd3892648' AND status = 'pending';