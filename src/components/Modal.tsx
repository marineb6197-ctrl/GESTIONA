import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={20}/></button></header>
        {children}
      </section>
    </div>
  )
}
