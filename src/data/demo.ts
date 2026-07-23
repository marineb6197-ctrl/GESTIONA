import type { Alert, Establishment, Product, Supplier } from '../types'

export const establishments: Establishment[] = [
  { id: 'danish', name: 'Danish', theme: 'danish' },
  { id: 'elysee', name: "L'Élysée", theme: 'elysee' },
]

export const initialProducts: Product[] = [
  { id: 'p1', name: 'Saumon fumé Norvège', category: 'Poisson', supplier: 'Sligro', unit: 'kg', purchasePrice: 21.4, currentStock: 2.4, minStock: 4, establishmentId: 'danish' },
  { id: 'p2', name: 'Beurre doux', category: 'Crèmerie', supplier: 'Sligro', unit: 'kg', purchasePrice: 8.9, currentStock: 7, minStock: 5, establishmentId: 'danish' },
  { id: 'p3', name: 'Aperol', category: 'Bar', supplier: 'Sligro', unit: 'bouteille', purchasePrice: 13.7, currentStock: 3, minStock: 6, establishmentId: 'danish' },
  { id: 'p4', name: 'Filet de canard', category: 'Viande', supplier: 'Davigel', unit: 'kg', purchasePrice: 17.8, currentStock: 8, minStock: 6, establishmentId: 'elysee' },
  { id: 'p5', name: 'Noix de Saint-Jacques', category: 'Poisson', supplier: 'Océan Frais', unit: 'kg', purchasePrice: 31.2, currentStock: 1.5, minStock: 3, establishmentId: 'elysee' },
  { id: 'p6', name: 'Crémant', category: 'Bar', supplier: 'Maison du Vin', unit: 'bouteille', purchasePrice: 9.5, currentStock: 14, minStock: 8, establishmentId: 'elysee' },
]

export const suppliers: Supplier[] = [
  { id: 's1', name: 'Sligro', email: 'liege.logistiek@sligro-m.be', phone: '+32 4 000 00 00', leadTimeDays: 2, score: 91 },
  { id: 's2', name: 'Davigel', email: 'commandes@davigel.example', phone: '+32 4 111 11 11', leadTimeDays: 3, score: 87 },
  { id: 's3', name: 'Océan Frais', email: 'contact@ocean-frais.example', phone: '+32 4 222 22 22', leadTimeDays: 1, score: 94 },
  { id: 's4', name: 'Maison du Vin', email: 'commandes@maisonduvin.example', phone: '+32 4 333 33 33', leadTimeDays: 4, score: 89 },
]

export const alerts: Alert[] = [
  { id: 'a1', severity: 'critical', title: 'Saumon fumé non livré', detail: 'Commande Sligro du jour : 4 kg manquants.', module: 'Réceptions' },
  { id: 'a2', severity: 'warning', title: 'Facture à échéance demain', detail: 'Sligro — 1 842,30 € TTC.', module: 'Factures' },
  { id: 'a3', severity: 'warning', title: 'Stock critique', detail: 'Aperol : 3 bouteilles restantes.', module: 'Stocks' },
]
