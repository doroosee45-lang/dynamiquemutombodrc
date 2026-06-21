import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './config';
import { User } from './models/User.model';

async function createSuperAdmin() {
  await mongoose.connect(config.mongoUri);
  console.log('Connecté à MongoDB\n');

  const email = 'superadmin@dynamique-rdc.cd';

  // Supprimer si existe déjà pour recréer proprement
  await User.deleteOne({ email });

  const superAdmin = await User.create({
    email,
    password: 'SuperAdmin@Dynamique2026!',
    fullName: 'Israël Mutombo — Administrateur National',
    role: 'SUPERADMIN',
    province: 'KINSHASA',
    isEmailVerified: true,
    twoFAEnabled: false,
    reputationPoints: 99999,
    isBanned: false,
    bio: 'Administrateur national suprême de la Dynamique Israël Mutombo. Autorité de référence sur les 26 provinces de la RDC.',
    badges: [
      { badge: 'OBSERVER',       awardedAt: new Date('2024-01-01') },
      { badge: 'ACTIVIST',       awardedAt: new Date('2024-03-01') },
      { badge: 'CITIZEN_LEADER', awardedAt: new Date('2024-06-01') },
      { badge: 'INNOVATOR',      awardedAt: new Date('2024-09-01') },
    ],
  });

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        COMPTE SUPERADMIN NATIONAL CRÉÉ AVEC SUCCÈS       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  ID        : ${superAdmin._id}`);
  console.log(`║  Email     : ${superAdmin.email}          ║`);
  console.log('║  Mot passe : SuperAdmin@Dynamique2026!                   ║');
  console.log(`║  Rôle      : ${superAdmin.role}                                  ║`);
  console.log('║  Badges    : OBSERVER · ACTIVIST · CITIZEN_LEADER · 💡  ║');
  console.log('║  Points    : 99 999                                      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  PERMISSIONS NATIONALES                                  ║');
  console.log('║  ✅ Gérer tous les utilisateurs (26 provinces)           ║');
  console.log('║  ✅ Nommer / révoquer les admins provinciaux             ║');
  console.log('║  ✅ Modérer tous les signalements nationaux              ║');
  console.log('║  ✅ Publier dans le Fil d\'Actualité                      ║');
  console.log('║  ✅ Valider les innovations jeunes                       ║');
  console.log('║  ✅ Créer et gérer toutes les campagnes                  ║');
  console.log('║  ✅ Accès complet au panneau d\'administration            ║');
  console.log('║  ✅ Bannir / débannir des membres                        ║');
  console.log('║  ✅ Exporter les données CSV                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
}

createSuperAdmin().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
