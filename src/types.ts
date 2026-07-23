export type Establishment = {
  id: string
  name: string
  theme: 'danish' | 'elysee'
}

export type Product = {
  id: string
  name: string
  category: string
  supplier: string
  unit: string
  purchasePrice: number
  currentStock: number
  minStock: number
  establishmentId: string
}

export type Supplier = {
  id: string
  name: string
  email: string
  phone: string
  leadTimeDays: number
  score: number
}

export type Alert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  module: string
}
