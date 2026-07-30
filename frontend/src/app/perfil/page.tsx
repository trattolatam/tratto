'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { auth, upload } from '@/lib/api'
import { AGE_RANGES, GENDERS, INCOME_LEVELS, INTERESTS } from '@/lib/targeting'
import { COUNTRIES } from '@/lib/countries'

export default function PerfilPage() {
  const { user, fetchMe } = useAuthStore()
  const router = useRouter()

  const [form, setForm] = useState({ name: '', phone: '', city: '', country: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')

  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [incomeLevel, setIncomeLevel] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [savingTargeting, setSavingTargeting] = useState(false)
  const [targetingMsg, setTargetingMsg] = useState('')
  const [targetingErr, setTargetingErr] = useState('')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')

  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const handleResendVerification = async () => {
    if (!user) return
    setResending(true); setResendMsg('')
    try { await auth.resendVerification(user.email); setResendMsg('Te reenviamos el link de verificación. Revisá tu casilla (y spam).') }
    catch (err: any) { setResendMsg(err.message || 'Error al reenviar') }
    finally { setResending(false) }
  }

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarErr, setAvatarErr] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetchMe().catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    setForm({ name: user.name || '', phone: user.phone || '', city: user.city || '', country: user.country || '' })
    setAgeRange(user.ageRange || '')
    setGender(user.gender || '')
    setIncomeLevel(user.incomeLevel || '')
    setInterests(user.interests || [])
  }, [user])

  if (!user) return <div className="max-w-2xl mx-auto px-4 py-12 text-center"><i className="ti ti-loader-2 animate-spin text-3xl text-brand-slate block mb-3" /></div>

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true); setProfileMsg(''); setProfileErr('')
    try {
      await auth.updateProfile({ name: form.name, phone: form.phone || undefined, city: form.city || undefined, country: form.country })
      await fetchMe()
      setProfileMsg('Perfil actualizado correctamente.')
    } catch (err: any) { setProfileErr(err.message || 'Error actualizando el perfil') }
    finally { setSavingProfile(false) }
  }

  const toggleInterest = (i: string) => setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])

  const handleTargetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTargeting(true); setTargetingMsg(''); setTargetingErr('')
    try {
      await auth.updateTargeting({
        ageRange: ageRange || undefined, gender: gender || undefined,
        incomeLevel: incomeLevel || undefined, interests: interests.length > 0 ? interests : [],
      })
      await fetchMe()
      setTargetingMsg('Datos actualizados correctamente.')
    } catch (err: any) { setTargetingErr(err.message || 'Error actualizando tus datos') }
    finally { setSavingTargeting(false) }
  }

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr(''); setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwErr('Las contraseñas nuevas no coinciden'); return }
    if (pwForm.newPassword.length < 8) { setPwErr('La nueva contraseña debe tener al menos 8 caracteres'); return }
    setSavingPw(true)
    try {
      await auth.changePassword(pwForm.currentPassword, pwForm.newPassword)
      setPwMsg('Contraseña actualizada correctamente.')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) { setPwErr(err.message || 'Error actualizando la contraseña') }
    finally { setSavingPw(false) }
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setAvatarErr('Solo se aceptan imágenes JPG, PNG o WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarErr('El archivo supera el límite de 5MB'); return }
    setUploadingAvatar(true); setAvatarErr('')
    try {
      await upload.avatar(file)
      await fetchMe()
    } catch (err: any) { setAvatarErr(err.message || 'Error subiendo la foto') }
    finally { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = '' }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Mi perfil</h1>
        <p className="text-sm text-brand-slate">Gestioná tus datos personales y tu contraseña.</p>
      </div>

      {!user.isVerified && (
        <div className="card p-4 border border-brand-amber/30 bg-brand-amber-dim/30 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-brand-amber">Todavía no confirmaste tu email</p>
            <p className="text-xs text-brand-slate mt-0.5">Necesitás confirmarlo para poder dejar reseñas o crear tu empresa.</p>
            {resendMsg && <p className="text-xs text-brand-dark mt-1.5">{resendMsg}</p>}
          </div>
          <button onClick={handleResendVerification} disabled={resending} className="btn-secondary text-xs py-2 px-3 whitespace-nowrap disabled:opacity-50">{resending ? 'Enviando...' : 'Reenviar email'}</button>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-bold text-xl flex-shrink-0">{user.name.charAt(0).toUpperCase()}</div>}
          <div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            <button onClick={handleAvatarClick} disabled={uploadingAvatar} className="btn-secondary text-xs py-2 px-3 disabled:opacity-50">
              <i className={`ti ${uploadingAvatar ? 'ti-loader-2 animate-spin' : 'ti-camera'} text-sm`} /> {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </button>
            {avatarErr && <p className="text-xs text-brand-red mt-1">{avatarErr}</p>}
          </div>
        </div>

        <h2 className="text-sm font-semibold text-brand-dark mb-4">Datos personales</h2>
        {profileErr && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{profileErr}</div>}
        {profileMsg && <div className="bg-brand-green-dim border border-brand-green/20 rounded-lg p-3 mb-4 text-sm text-brand-green">{profileMsg}</div>}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div><label className="label">Nombre</label><input type="text" required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Email</label><input type="email" disabled className="input opacity-60" value={user.email} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Teléfono</label><input type="text" className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Ciudad</label><input type="text" className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">País</label>
            <select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={savingProfile || !form.name} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{savingProfile ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-brand-dark mb-1">Datos de segmentación</h2>
        <p className="text-xs text-brand-slate mb-4">Nos ayudan a mostrarte anuncios más relevantes. Es opcional — dejá en blanco lo que prefieras no decir.</p>
        {targetingErr && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{targetingErr}</div>}
        {targetingMsg && <div className="bg-brand-green-dim border border-brand-green/20 rounded-lg p-3 mb-4 text-sm text-brand-green">{targetingMsg}</div>}
        <form onSubmit={handleTargetingSubmit} className="space-y-4">
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
            <label className="label">Intereses</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button key={i} type="button" onClick={() => toggleInterest(i)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${interests.includes(i) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{i}</button>
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
          <button type="submit" disabled={savingTargeting} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{savingTargeting ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-brand-dark mb-4">Cambiar contraseña</h2>
        {pwErr && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{pwErr}</div>}
        {pwMsg && <div className="bg-brand-green-dim border border-brand-green/20 rounded-lg p-3 mb-4 text-sm text-brand-green">{pwMsg}</div>}
        <form onSubmit={handlePwSubmit} className="space-y-4">
          <div><label className="label">Contraseña actual</label><input type="password" required className="input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
          <div><label className="label">Nueva contraseña</label><input type="password" required minLength={8} className="input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
          <div><label className="label">Confirmar nueva contraseña</label><input type="password" required minLength={8} className="input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
          <button type="submit" disabled={savingPw || !pwForm.currentPassword || !pwForm.newPassword} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{savingPw ? 'Guardando...' : 'Cambiar contraseña'}</button>
        </form>
      </div>
    </div>
  )
}
