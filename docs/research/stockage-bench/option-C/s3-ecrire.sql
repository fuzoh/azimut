\set v random(0, 4)
select * from azimut.ecrire_note('019e807a-ec1f-791c-96fa-7ee2192c21ca', '019e807a-ec7f-7798-9e58-3c88f712626f', case when :client_id = 0 then 'gestion' else 'consignes-e2' end, :v, azimut.uuid_v7(), case when :client_id = 0 then '019e807a-ec00-74b5-a42c-cbd6b3189014'::uuid else '019e807a-ec01-74ad-9ed7-ecf7f7db66fb'::uuid end);
