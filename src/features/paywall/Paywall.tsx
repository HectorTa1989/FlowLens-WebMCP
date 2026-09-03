import { PolarEmbedCheckout } from '@polar-sh/checkout/embed'
import { Check, LockKeyhole, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../app/store'

const features = ['Selection-aware repair previews', 'Human-gated patch application', 'Before-and-after run proof', 'Unlimited local workflow history']

export function Paywall() {
  const { state, closePaywall } = useAppStore()
  const [error, setError] = useState('')
  const checkoutUrl = import.meta.env.VITE_POLAR_CHECKOUT_URL as string | undefined
  if (!state.paywallFeature) return null

  const startCheckout = async () => {
    if (!checkoutUrl || checkoutUrl.includes('your-organization')) {
      setError('Add your Polar Checkout Link to VITE_POLAR_CHECKOUT_URL to enable purchases.')
      return
    }
    try {
      setError('')
      await PolarEmbedCheckout.create(`${checkoutUrl}${checkoutUrl.includes('?') ? '&' : '?'}reference_id=flowlens-guest&theme=dark`, { theme: 'dark' })
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Polar checkout could not open.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePaywall() }}>
      <section className="paywall-modal" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <button className="modal-close" onClick={closePaywall} aria-label="Close"><X size={17} /></button>
        <div className="paywall-glow"><Sparkles size={22} /></div>
        <span className="eyebrow">FlowLens Pro · Polar</span>
        <h2 id="paywall-title">Repair workflows<br />with proof, not guesses.</h2>
        <p className="paywall-lede"><strong>{state.paywallFeature}</strong> is part of the Pro workspace. Checkout stays secure on Polar.</p>
        <div className="price-line"><strong>$19</strong><span>per workspace<br /><small>billed monthly</small></span></div>
        <ul>{features.map((feature) => <li key={feature}><span><Check size={12} /></span>{feature}</li>)}</ul>
        <button className="checkout-button" onClick={startCheckout}><LockKeyhole size={15} /> Continue with Polar <span>↗</span></button>
        {error && <div className="checkout-error">{error}</div>}
        <div className="checkout-trust"><ShieldCheck size={14} /> Secure hosted checkout · Cancel anytime</div>
        <div className="admin-note"><span className="avatar small">HT</span><span><strong>Admin access stays unlocked</strong><small>Switch back to HectorTa1989 from the account menu.</small></span></div>
      </section>
    </div>
  )
}
