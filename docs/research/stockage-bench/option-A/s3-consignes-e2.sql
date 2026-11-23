\set val random(0, 4)
select * from azimut.ecrire_note(azimut.uuidv7(), ':v'::uuid, '019e807a-ec7f-7798-9e58-3c88f712626f', 'consignes-e2', :val, ':auteur'::uuid);
