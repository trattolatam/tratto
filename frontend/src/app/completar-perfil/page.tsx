'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth, categories as categoriesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AGE_RANGES, GENDERS, INCOME_LEVELS } from '@/lib/targeting'

export default function CompletarPerfilPage() {
  const router = useRouter()
  const { fetchMe } = useAuthStore()
  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [incomeLevel, setIncomeLevel] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<any[]>([])

  useEffect(() => {
    categoriesApi.list().then((data: any) => setCategoryOptions(data.categories)).catch(() => {})
  }, [])

  const toggleInterest = (i: string) => setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])

  const goHome = () => router.push('/')

  const handleSave = async () => {
    setSaving(true)
    try {
      await auth.updateTargeting({
        ageRange: ageRange || undefined,
        gender: gender || undefined,
        incomeLevel: incomeLevel || undefined,
        interests: interests.length > 0 ? interests : undefined,
      })
      await fetchMe()
      goHome()
    } catch (err: any) { alert(err.message || 'Error al guardar'); setSaving(false) }
  }

  const handleSkip = async () => {
    try { await auth.skipTargeting() } catch { /* si falla, igual lo dejamos seguir */ }
    goHome()
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-dark">Contanos un poco de vos</h1>
        <p className="text-sm text-brand-slate mt-1">Nos ayuda a mostrarte anuncios más relevantes. Es 100% opcional — contestá lo que quieras.</p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="label">Rango de edad</label>
          <div className="grid grid-cols-3 gap-2">
            {AGE_RANGES.map((r) => (
              <button key={r.value} type="button" onClick={() => setAgeRange(ageRange === r.value ? '' : r.value)} className={`text-xs py-2 px-2 rounded-lg border transition-all ${ageRange === r.value ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{r.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Género</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button key={g.value} type="button" onClick={() => setGender(gender === g.value ? '' : g.value)} className={`text-xs py-2 px-2 rounded-lg border transition-all ${gender === g.value ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{g.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Rubros que te interesan <span className="font-normal normal-case text-gray-400">(elegí los que quieras)</span></label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <button key={c.slug} type="button" onClick={() => toggleInterest(c.slug)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${interests.includes(c.slug) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{c.name}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Nivel de ingresos</label>
          <div className="grid grid-cols-2 gap-2">
            {INCOME_LEVELS.map((l) => (
              <button key={l.value} type="button" onClick={() => setIncomeLevel(incomeLevel === l.value ? '' : l.value)} className={`text-xs py-2 px-2 rounded-lg border transition-all ${incomeLevel === l.value ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{l.label}</button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 text-sm disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar y continuar'}</button>
      </div>

      <button onClick={handleSkip} className="w-full text-center text-sm text-brand-slate hover:text-brand-dark mt-4">Completar más tarde</button>
    </div>
  )
}
