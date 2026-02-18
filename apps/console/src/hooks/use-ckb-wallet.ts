import { useState, useEffect } from 'react'
import { ccc } from '@ckb-ccc/connector-react'

export function useCkbWallet() {
  const { wallet, open, disconnect } = ccc.useCcc()
  const signer = ccc.useSigner()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!signer) {
      setAddress('')
      setBalance('')
      return
    }
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const addr = await signer.getRecommendedAddress()
        if (mounted) setAddress(addr)
        const bal = await signer.getBalance()
        const ckb = (Number(bal) / 100_000_000).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        if (mounted) setBalance(ckb)
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [signer])

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`
  }

  return { wallet, signer, open, disconnect, address, balance, loading, formatAddress }
}
