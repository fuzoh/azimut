\set val random(0, 4)
select * from azimut.ecrire_note(azimut.uuidv7(), '01a204be-5247-7d74-ac28-2ebd19c298b1'::uuid, '019e807a-ec7f-7798-9e58-3c88f712626f', case when :client_id = 0 then 'gestion' else 'consignes-e2' end, :val, '019e807a-ec00-74b5-a42c-cbd6b3189014'::uuid);
