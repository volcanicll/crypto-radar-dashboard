// === 浏览器通知模块 ===

const THROTTLE_MS = 5 * 60 * 1000 // 5分钟节流
const notifiedMap = new Map<string, number>() // key → timestamp

function throttleKey(coin: string, type: string): string {
  return `${type}:${coin}`
}

function canNotify(coin: string, type: string): boolean {
  const key = throttleKey(coin, type)
  const last = notifiedMap.get(key)
  if (last && Date.now() - last < THROTTLE_MS) return false
  notifiedMap.set(key, Date.now())
  return true
}

export function requestNotificationPermission(): void {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export function notifySignal(type: string, message: string): void {
  if (getNotificationPermission() !== 'granted') return
  if (!canNotify(message, type)) return

  try {
    new Notification(`🛰️ Narrative Radar`, {
      body: message,
      tag: `radar-${type}-${Date.now()}`,
      icon: '/favicon.ico',
    })
  } catch {
    // 某些环境不支持 new Notification
  }
}

// === 通知触发函数 ===

export function notifyFiringPool(coin: string): void {
  notifySignal('pool', `🚨 ${coin} 进入收筹点火`)
}

export function notifyOIAlert(coin: string, delta: number): void {
  notifySignal('oi', `📊 ${coin} OI 异动 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`)
}

export function notifyNarrativeMomentum(symbol: string, gain: number): void {
  notifySignal('narrative', `🛰️ ${symbol} 动量信号 🔥 +${gain.toFixed(1)}%`)
}

export function notifyShortSqueeze(coin: string, pxChg: number): void {
  notifySignal('squeeze', `🚀 ${coin} 空头轧空! 涨${pxChg.toFixed(1)}%`)
}
