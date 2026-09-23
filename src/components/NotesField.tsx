import { useEffect, useState } from 'react'

/** Small auto-saving textarea — saves on blur when the text actually changed. */
export function NotesField({
  value,
  placeholder,
  onSave,
  rows = 2,
}: {
  value: string | null
  placeholder: string
  onSave: (notes: string) => Promise<void>
  rows?: number
}) {
  const [text, setText] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setText(value ?? '')
  }, [value])

  async function handleBlur() {
    if (text === (value ?? '')) return
    setSaving(true)
    try {
      await onSave(text)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm resize-y focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors placeholder:text-text-faint"
      />
      <div className="text-[10px] text-text-faint mt-1 h-3">{saving ? 'Saving…' : justSaved ? 'Saved' : ''}</div>
    </div>
  )
}
