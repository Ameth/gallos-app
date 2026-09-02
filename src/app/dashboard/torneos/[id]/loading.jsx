import { Loader2 } from 'lucide-react'

export default function LoadingTorneo() {
  return (
    <div className='min-h-[70vh] flex flex-col items-center justify-center space-y-4'>
      <div className='relative'>
        <div className='w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin' />
        <div className='absolute inset-0 flex items-center justify-center'>
          <Loader2 className='w-6 h-6 text-amber-500 animate-pulse' />
        </div>
      </div>
      <div className='text-center space-y-1'>
        <p className='text-sm font-bold text-slate-200 tracking-wider uppercase'>
          Cargando Torneo
        </p>
        <p className='text-xs text-slate-500'>
          Obteniendo báscula, combates y estadísticas...
        </p>
      </div>
    </div>
  )
}
