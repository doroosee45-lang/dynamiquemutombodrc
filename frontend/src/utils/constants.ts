export const PROVINCES = [
  { value: 'KINSHASA', label: 'Kinshasa (Capitale)' },
  { value: 'KONGO_CENTRAL', label: 'Kongo-Central' },
  { value: 'KWANGO', label: 'Kwango' },
  { value: 'KWILU', label: 'Kwilu' },
  { value: 'MAI_NDOMBE', label: 'Maï-Ndombe' },
  { value: 'KASAI', label: 'Kasaï' },
  { value: 'KASAI_CENTRAL', label: 'Kasaï-Central' },
  { value: 'KASAI_ORIENTAL', label: 'Kasaï-Oriental' },
  { value: 'LOMAMI', label: 'Lomami' },
  { value: 'SANKURU', label: 'Sankuru' },
  { value: 'MANIEMA', label: 'Maniema' },
  { value: 'SUD_KIVU', label: 'Sud-Kivu' },
  { value: 'NORD_KIVU', label: 'Nord-Kivu' },
  { value: 'ITURI', label: 'Ituri' },
  { value: 'HAUT_UELE', label: 'Haut-Uélé' },
  { value: 'BAS_UELE', label: 'Bas-Uélé' },
  { value: 'TSHOPO', label: 'Tshopo' },
  { value: 'MONGALA', label: 'Mongala' },
  { value: 'NORD_UBANGI', label: 'Nord-Ubangi' },
  { value: 'SUD_UBANGI', label: 'Sud-Ubangi' },
  { value: 'EQUATEUR', label: 'Équateur' },
  { value: 'TSHUAPA', label: 'Tshuapa' },
  { value: 'TANGANIKA', label: 'Tanganika' },
  { value: 'HAUT_LOMAMI', label: 'Haut-Lomami' },
  { value: 'LUALABA', label: 'Lualaba' },
  { value: 'HAUT_KATANGA', label: 'Haut-Katanga' },
];

export const DISTRICTS = [
  { value: 'LUKUNGA', label: 'Lukunga', communes: 'Ngaliema, Barumbu, Lingwala, Kinshasa, Gombe' },
  { value: 'FUNA', label: 'Funa', communes: 'Selembao, Bumbu, Makala, Ngiri-Ngiri, Kasa-Vubu, Kalamu' },
  { value: 'MONT_AMBA', label: 'Mont-Amba', communes: 'Lemba, Kisenso, Matete, Ngaba' },
  { value: 'TSHANGU', label: 'Tshangu', communes: 'Masina, N\'Djili, Kimbanseke, Maluku' },
];

export const REPORT_CATEGORIES = [
  { value: 'INSECURITY', label: 'Insécurité', color: 'text-red-600', bg: 'bg-red-100', icon: '🔴' },
  { value: 'BANDITRY', label: 'Banditisme', color: 'text-orange-600', bg: 'bg-orange-100', icon: '⚠️' },
  { value: 'TRANSPORT', label: 'Transport', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🚌' },
  { value: 'CORRUPTION', label: 'Corruption', color: 'text-purple-600', bg: 'bg-purple-100', icon: '💰' },
  { value: 'TRIBALISM', label: 'Tribalisme', color: 'text-pink-600', bg: 'bg-pink-100', icon: '⚡' },
  { value: 'ADMINISTRATIVE', label: 'Tracasseries admin.', color: 'text-blue-600', bg: 'bg-blue-100', icon: '📋' },
  { value: 'OTHER', label: 'Autre', color: 'text-gray-600', bg: 'bg-gray-100', icon: '📌' },
];

export const REPORT_STATUSES = [
  { value: 'PENDING', label: 'En attente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  { value: 'VERIFIED', label: 'Vérifié', color: 'text-blue-700', bg: 'bg-blue-100' },
  { value: 'IN_PROGRESS', label: 'En cours', color: 'text-orange-700', bg: 'bg-orange-100' },
  { value: 'RESOLVED', label: 'Résolu', color: 'text-green-700', bg: 'bg-green-100' },
  { value: 'REJECTED', label: 'Rejeté', color: 'text-red-700', bg: 'bg-red-100' },
];

export const BADGE_INFO = {
  OBSERVER: { label: 'Observateur', points: 500, color: 'text-blue-600', icon: '👁️' },
  ACTIVIST: { label: 'Activiste', points: 2000, color: 'text-orange-600', icon: '✊' },
  CITIZEN_LEADER: { label: 'Leader Citoyen', points: 5000, color: 'text-gold-500', icon: '⭐' },
  INNOVATOR: { label: 'Innovateur', points: 0, color: 'text-purple-600', icon: '💡' },
};

export const MAP_CENTER: [number, number] = [-4.3, 21.7];
export const MAP_ZOOM = 6;

export const THEMATIC_GROUPS = [
  { id: 'security', label: 'Sécurité', icon: '🛡️' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'corruption', label: 'Corruption & Impunité', icon: '⚖️' },
  { id: 'actualite', label: 'Actualité RDC', icon: '📰' },
  { id: 'innovation', label: 'Innovation Jeunes', icon: '💡' },
  { id: 'social', label: 'Questions Sociales', icon: '🤝' },
];
