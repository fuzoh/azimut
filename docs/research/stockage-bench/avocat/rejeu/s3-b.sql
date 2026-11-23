\set val random(0, 1)
select * from b.ecrire('019e807a-ec1f-791c-96fa-7ee2192c21ca', '019e807a-ec7f-7798-9e58-3c88f712626f', 'note', case when :client_id = 0 then 'gestion' else 'consignes-e2' end, jsonb_build_object('valeur', :val), b.uuidv7(), '019e807a-ec00-74b5-a42c-cbd6b3189014');
