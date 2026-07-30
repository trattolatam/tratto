'use client'
import { useState, useRef, useEffect } from 'react'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { COUNTRIES, findCountry, CountryOption } from '@/lib/countries'

export function CountryPhoneInput({
  label, countryCode, number, onCountryChange, onNumberChange,
}: {
  label: string
  countryCode: string
  number: string
  onCountryChange: (code: string) => void
  onNumberChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const country = findCountry(countryCode)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setOpen(false); setSearch('') } }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search))
  const isValid = number.length === 0 || isValidPhoneNumber(number, countryCode as any)

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <div className="relative" ref={wrapperRef}>
          <button type="button" onClick={() => setOpen(!open)} className="input text-sm flex items-center gap-1.5 w-28">
            <span>{country.flag}</span><span className="text-brand-slate">{country.dialCode}</span><i className="ti ti-chevron-down text-xs ml-auto" />
          </button>
          {open && (
            <div className="absolute z-20 top-full mt-1 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-100 max-h-64 overflow-hidden flex flex-col">
              <input autoFocus placeholder="Buscar país..." className="input text-sm m-2 w-auto" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="overflow-y-auto">
                {filtered.map((c) => (
                  <button key={c.code} type="button" onClick={() => { onCountryChange(c.code); setOpen(false); setSearch('') }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left">
                    <span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-brand-slate">{c.dialCode}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-brand-slate px-3 py-2">Sin resultados</p>}
              </div>
            </div>
          )}
        </div>
        <input
          type="tel" placeholder="97 550 450" value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          className={`input text-sm flex-1 ${number.length > 0 && !isValid ? 'border-brand-red' : ''}`}
        />
      </div>
      {number.length > 0 && !isValid && <p className="text-xs text-brand-red mt-1">Ingresá un número de teléfono válido para {country.name}.</p>}
    </div>
  )
}
