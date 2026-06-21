import mongoose, { Schema, Document, Types } from 'mongoose';

export type TerritoryType =
  | 'DISTRICT'     // District urbain (Kinshasa uniquement: Funa, Lukunga, Mont-Amba, Tshangu)
  | 'VILLE'        // Ville / Cité
  | 'TERRITOIRE'   // Territoire rural
  | 'COMMUNE'      // Commune (sous Ville ou District)
  | 'SECTEUR'      // Secteur (sous Territoire)
  | 'CHEFFERIE'    // Chefferie (sous Territoire, autorité traditionnelle)
  | 'GROUPEMENT'   // Groupement (sous Secteur/Chefferie)
  | 'QUARTIER'     // Quartier (sous Commune)
  | 'VILLAGE';     // Village (sous Groupement/Quartier)

export interface ITerritory extends Document {
  _id: Types.ObjectId;
  province: string;
  district?: string; // only for KINSHASA territories — links to DISTRICT_ADMIN's district
  type: TerritoryType;
  name: string;
  parentId?: Types.ObjectId;
  code?: string;
  population?: number;
  chief?: string;
  notes?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TerritorySchema = new Schema<ITerritory>(
  {
    province: { type: String, required: true, index: true },
    district: { type: String, index: true }, // only for KINSHASA
    type: {
      type: String,
      required: true,
      enum: ['DISTRICT', 'VILLE', 'TERRITOIRE', 'COMMUNE', 'SECTEUR', 'CHEFFERIE', 'GROUPEMENT', 'QUARTIER', 'VILLAGE'],
    },
    name: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Territory', default: null },
    code: { type: String, trim: true },
    population: { type: Number, min: 0 },
    chief: { type: String, trim: true },
    notes: String,
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TerritorySchema.index({ province: 1, type: 1 });
TerritorySchema.index({ province: 1, parentId: 1 });
TerritorySchema.index({ province: 1, name: 1 });

export const Territory = mongoose.model<ITerritory>('Territory', TerritorySchema);
