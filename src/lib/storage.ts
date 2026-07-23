import type { Product } from '../types'
import { initialProducts } from '../data/demo'

const PRODUCTS_KEY = 'gestiona.products.v1'

export function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY)
    return raw ? JSON.parse(raw) as Product[] : initialProducts
  } catch {
    return initialProducts
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}
