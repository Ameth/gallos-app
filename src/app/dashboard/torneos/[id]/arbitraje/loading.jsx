import { Loader2 } from 'lucide-react'

export default function LoadingArbitraje() {
  return (
    <div className='min-h-[70vh] flex flex-col items-center justify-center space-y-4'>
      <div className='w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin' />
      <div className='text-center space-y-1'>
        <p className='text-sm font-bold text-slate-200 tracking-wider uppercase'>
          Conectando Mesa de Arbitraje
        </p>
        <p className='text-xs text-slate-500'>
          Sincronizando cronómetro y combates en vivo...
        </p>
      </div>
    </div>
  )
}
