import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './config';
import { User } from './models/User.model';
import { Report } from './models/Report.model';
import { Publication } from './models/Publication.model';

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  // Clean
  await Promise.all([User.deleteMany({}), Report.deleteMany({}), Publication.deleteMany({})]);
  console.log('Collections cleared');

  // Users
  const [admin, sango, citoyen] = await User.create([
    {
      email: 'admin@dynamique-rdc.cd',
      password: 'Admin@Dynamique2026!',
      fullName: 'Administrateur National',
      role: 'SUPERADMIN',
      province: 'KINSHASA',
      isEmailVerified: true,
    },
    {
      email: 'sango@dynamique-rdc.cd',
      password: 'Sango@Dynamique2026!',
      fullName: 'Israël Mutombo (Sango)',
      role: 'EDITOR',
      province: 'KINSHASA',
      isEmailVerified: true,
      bio: 'Journaliste d\'investigation — Autorité de Référence de la Dynamique',
    },
    {
      email: 'citoyen@example.com',
      password: 'Citoyen@2026!',
      fullName: 'Jean-Pierre Mukendi',
      role: 'CITIZEN',
      province: 'NORD_KIVU',
      district: undefined,
      isEmailVerified: true,
      reputationPoints: 650,
      badges: [{ badge: 'OBSERVER', awardedAt: new Date() }],
    },
  ]);

  console.log('Users created:', admin.email, sango.email, citoyen.email);

  // Reports
  await Report.create([
    {
      title: 'Insécurité sur l\'avenue Kasa-Vubu à Kinshasa',
      description: 'Des individus armés ont attaqué plusieurs piétons dans la soirée du 15 juin 2026. Au moins 3 personnes ont été blessées. La police tarde à intervenir dans ce quartier.',
      category: 'INSECURITY',
      status: 'VERIFIED',
      province: 'KINSHASA',
      district: 'FUNA',
      commune: 'Kasa-Vubu',
      latitude: -4.3247,
      longitude: 15.3221,
      author: citoyen._id,
      confidenceScore: 0.87,
      viewCount: 142,
      votes: [{ user: admin._id, value: 1 }],
    },
    {
      title: 'Tracasseries policières au poste frontière de Kasindi',
      description: 'Des policiers exigent systématiquement des paiements informels aux commerçants qui traversent la frontière. Le montant varie entre 5 et 20 dollars par passage selon les témoignages recueillis.',
      category: 'CORRUPTION',
      status: 'IN_PROGRESS',
      province: 'NORD_KIVU',
      latitude: 0.0337,
      longitude: 29.7076,
      author: citoyen._id,
      confidenceScore: 0.91,
      viewCount: 89,
    },
    {
      title: 'Route nationale N1 impraticable entre Matadi et Kinshasa',
      description: 'La route est dans un état catastrophique sur 40 km. Les chauffeurs doivent payer des rançons aux militaires postés aux barrières illégales.',
      category: 'TRANSPORT',
      status: 'PENDING',
      province: 'KONGO_CENTRAL',
      latitude: -5.1234,
      longitude: 15.0056,
      author: citoyen._id,
      confidenceScore: 0.79,
      viewCount: 56,
    },
  ]);

  // Publications
  await Publication.create([
    {
      title: 'Enquête exclusive : le réseau de corruption au sein des douanes de Lubumbashi',
      content: `Une investigation de plusieurs mois menée par la Dynamique Israël Mutombo révèle l'existence d'un réseau organisé de corruption au sein des services douaniers de Lubumbashi. Des fonctionnaires perçoivent des commissions illégales sur chaque conteneur importé, représentant des millions de dollars détournés chaque année au détriment du trésor public.

Les preuves collectées incluent des enregistrements audio, des relevés bancaires et des témoignages de victimes. Le préjudice estimé dépasse 15 millions de dollars pour la seule année 2025.

La Dynamique appelle les autorités compétentes à ouvrir une enquête judiciaire immédiate et à protéger les lanceurs d'alerte qui ont contribué à cette investigation.`,
      excerpt: 'Une investigation révèle un réseau de corruption au sein des douanes de Lubumbashi représentant 15 millions de dollars détournés.',
      type: 'INVESTIGATION',
      category: 'corruption',
      province: 'Haut-Katanga',
      isUrgent: false,
      isPinned: true,
      tags: ['corruption', 'douanes', 'Lubumbashi', 'enquête'],
      author: sango._id,
      publishedAt: new Date(),
    },
    {
      title: 'ALERTE URGENTE : Regain de violence à Butembo — Mesures de sécurité',
      content: `La Dynamique Israël Mutombo lance une alerte urgente concernant la recrudescence d'attaques armées dans les quartiers nord de Butembo (Nord-Kivu).

CONSIGNES DE SÉCURITÉ :
• Évitez les déplacements nocturnes entre 19h et 6h
• Signalez tout mouvement suspect au numéro d'urgence
• Les marchés du secteur Vulindi sont temporairement déconseillés

Nos correspondants locaux documentent la situation en temps réel. Des signalements peuvent être soumis via l'application pour permettre une cartographie des zones à risque.`,
      excerpt: 'Alerte urgente : recrudescence d\'attaques armées à Butembo. Mesures de sécurité recommandées.',
      type: 'ALERT',
      category: 'securite',
      province: 'Nord-Kivu',
      isUrgent: true,
      isPinned: true,
      tags: ['alerte', 'Butembo', 'securite', 'Nord-Kivu'],
      author: sango._id,
      publishedAt: new Date(),
    },
    {
      title: 'Communiqué : La Dynamique lance son réseau de 26 bureaux provinciaux',
      content: `La Dynamique Israël Mutombo a le plaisir d'annoncer l'activation officielle de ses 26 bureaux provinciaux sur l'ensemble du territoire national de la République Démocratique du Congo.

Chaque bureau provincial est désormais opérationnel avec :
- Un coordinateur provincial désigné
- Un accès à la plateforme numérique
- Un mandat de modération des signalements locaux
- Une mission d'animation communautaire

Cette expansion marque une étape décisive dans notre mission de couvrir l'intégralité du territoire congolais au service des citoyens.`,
      excerpt: 'La Dynamique active officiellement ses 26 bureaux provinciaux couvrant l\'ensemble du territoire national.',
      type: 'COMMUNIQUE',
      category: 'organisation',
      isUrgent: false,
      isPinned: false,
      tags: ['annonce', 'bureaux', 'provinces', 'organisation'],
      author: sango._id,
      publishedAt: new Date(),
    },
  ]);

  console.log('Seed completed successfully ✅');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Admin    : admin@dynamique-rdc.cd  / Admin@Dynamique2026!');
  console.log('  Sango    : sango@dynamique-rdc.cd  / Sango@Dynamique2026!');
  console.log('  Citoyen  : citoyen@example.com     / Citoyen@2026!');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
