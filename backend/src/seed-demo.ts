import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './config';
import { User } from './models/User.model';

const DEMO_USERS = [
  {
    email: 'admin.kinshasa@dynamique-rdc.cd',
    password: 'Admin@Dynamique2026!',
    fullName: 'Admin Provincial — Kinshasa',
    role: 'ADMIN' as const,
    province: 'KINSHASA',
    isEmailVerified: true,
  },
  {
    email: 'citoyen@example.com',
    password: 'Citoyen@2026!',
    fullName: 'Jean-Paul Citoyen',
    role: 'CITIZEN' as const,
    province: 'KINSHASA',
    isEmailVerified: true,
  },
];

async function seedDemo() {
  await mongoose.connect(config.mongoUri);
  console.log('Connecté à MongoDB\n');

  for (const data of DEMO_USERS) {
    await User.deleteOne({ email: data.email });
    const u = await User.create(data);
    console.log(`✅ ${u.role.padEnd(12)} ${u.email}`);
  }

  console.log('\nComptes de démonstration créés avec succès.');
  console.log('─────────────────────────────────────────────────');
  console.log('Super Admin    superadmin@dynamique-rdc.cd  SuperAdmin@Dynamique2026!');
  console.log('Admin Kinshasa admin.kinshasa@dynamique-rdc.cd  Admin@Dynamique2026!');
  console.log('Citoyen        citoyen@example.com              Citoyen@2026!');
  console.log('─────────────────────────────────────────────────');

  await mongoose.disconnect();
}

seedDemo().catch(err => { console.error('Erreur:', err); process.exit(1); });
