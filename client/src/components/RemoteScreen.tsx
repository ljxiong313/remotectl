import { useCallback, useEffect, useRef, useState } from 'react'
import type { InputEvent } from '../types'
import { useI18n } from '../i18n'

const isLocalMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform)
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// 向日葵风格配色
const COLORS = {
  primary: '#FF7A00',
  primaryDark: '#E66A00',
  primaryBg: 'rgba(255, 122, 0, 0.1)',
  surface: '#FFFFFF',
  surface2: '#F5F5F5',
  surface3: '#EBEBEB',
  border: '#E8E8E8',
  text1: '#333333',
  text2: '#666666',
  text3: '#999999',
  success: '#52C41A',
  error: '#FF4D4F',
  warning: '#FAAD14',
}

interface Props {
  videoStream: MediaStream | null
  onInput: (e: InputEvent) => void
  onDisconnect: () => void
  deviceName: string
  remotePlatform: string
}

// 工具栏按钮定义
interface ToolButton {
  id: string
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
}

export default function RemoteScreen({ videoStream, onInput, onDisconnect, deviceName, remotePlatform }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const kbInputRef = useRef<HTMLInputElement>(null)
  
  const [showKb, setShowKb] = useState(false)
  const [showDisconnectDlg, setShowDisconnectDlg] = useState(false)
  const [connectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')

  // Ctrl/Cmd 切换
  const defaultSwap = !isLocalMac && (remotePlatform === 'darwin' || remotePlatform === '')
  const [swapCtrlCmd, setSwapCtrlCmd] = useState(defaultSwap)

  // 移动端修饰键
  const [activeMods, setActiveMods] = useState<Set<string>>(new Set())

  // 工具栏自动隐藏
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toolbarVisible, setToolbarVisible] = useState(true)

  const resetHideTimer = useCallback(() => {
    if (!isMobile) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setToolbarVisible(false), 3000)
    }
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setToolbarVisible(true)
      resetHideTimer()
    }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.srcObject = videoStream
    if (videoStream) v.play().catch(() => {})
  }, [videoStream])

  // 坐标映射
  const toRemote = useCallback((clientX: number, clientY: number): [number, number] => {
    const v = videoRef.current
    if (!v || !v.videoWidth || !v.videoHeight) return [0, 0]
    const rect = v.getBoundingClientRect()
    const vAspect = v.videoWidth / v.videoHeight
    const cAspect = rect.width / rect.height
    let rW: number, rH: number, oX: number, oY: number
    if (vAspect > cAspect) {
      rW = rect.width; rH = rect.width / vAspect
      oX = 0; oY = (rect.height - rH) / 2
    } else {
      rW = rect.height * vAspect; rH = rect.height
      oX = (rect.width - rW) / 2; oY = 0
    }
    const x = ((clientX - rect.left - oX) / rW) * v.videoWidth
    const y = ((clientY - rect.top - oY) / rH) * v.videoHeight
    return [Math.round(x), Math.round(y)]
  }, [])

  const moveCursor = useCallback((clientX: number, clientY: number, show: boolean) => {
    const c = cursorRef.current
    const v = videoRef.current
    if (!c || !v) return
    const rect = v.getBoundingClientRect()
    c.style.left = `${clientX - rect.left}px`
    c.style.top = `${clientY - rect.top}px`
    c.style.display = show ? 'block' : 'none'
  }, [])

  // 键盘修饰键
  const getMods = useCallback((e: MouseEvent | KeyboardEvent): string[] => {
    const m: string[] = []
    if (e.ctrlKey) m.push('ctrl')
    if (e.shiftKey) m.push('shift')
    if (e.altKey) m.push('alt')
    if (e.metaKey) m.push('meta')
    if (!swapCtrlCmd) return m
    return m.map(k => k === 'ctrl' ? 'meta' : k === 'meta' ? 'ctrl' : k)
  }, [swapCtrlCmd])

  const getActiveMods = useCallback((): string[] => {
    const mods = [...activeMods]
    if (!swapCtrlCmd) return mods
    return mods.map(k => k === 'ctrl' ? 'meta' : k === 'meta' ? 'ctrl' : k)
  }, [activeMods, swapCtrlCmd])

  const clearMods = useCallback(() => setActiveMods(new Set()), [])

  // 桌面鼠标事件
  const lastSendTime = useRef(0)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    resetHideTimer()
    moveCursor(e.clientX, e.clientY, true)
    const now = performance.now()
    if (now - lastSendTime.current < 8) return
    lastSendTime.current = now
    const [x, y] = toRemote(e.clientX, e.clientY)
    onInput({ event: 'mousemove', x, y })
  }, [toRemote, onInput, moveCursor, resetHideTimer])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const [x, y] = toRemote(e.clientX, e.clientY)
    onInput({ event: 'mousedown', x, y, button: e.button, mods: getMods(e.nativeEvent) })
  }, [toRemote, onInput, getMods])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const [x, y] = toRemote(e.clientX, e.clientY)
    onInput({ event: 'mouseup', x, y, button: e.button })
  }, [toRemote, onInput])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const [x, y] = toRemote(e.clientX, e.clientY)
    onInput({ event: 'dblclick', x, y, button: e.button })
  }, [toRemote, onInput])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    onInput({ event: 'scroll', dx: Math.round(e.deltaX), dy: Math.round(e.deltaY) })
  }, [onInput])

  const onContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault() }, [])

  // 触摸事件
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCentroid = useRef<{ x: number; y: number } | null>(null)
  const prevPinchDist = useRef<number | null>(null)
  const touchDragging = useRef(false)
  const twoFingerUsed = useRef(false)

  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
      touchDragging.current = false
      moveCursor(t.clientX, t.clientY, true)
      longPressTimer.current = setTimeout(() => {
        clearLongPress()
        const [rx2, ry2] = toRemote(t.clientX, t.clientY)
        onInput({ event: 'mousedown', x: rx2, y: ry2, button: 2 })
        onInput({ event: 'mouseup', x: rx2, y: ry2, button: 2 })
        touchStart.current = null
        if (navigator.vibrate) navigator.vibrate(40)
      }, 600)
    } else {
      clearLongPress()
      twoFingerUsed.current = true
      if (showKb) { setShowKb(false); setActiveMods(new Set()); kbInputRef.current?.blur() }
      setToolbarVisible(false)
      const t0 = e.touches[0], t1 = e.touches[1]
      const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY
      prevPinchDist.current = Math.hypot(dx, dy)
      prevCentroid.current = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 }
    }
  }, [toRemote, onInput, moveCursor, showKb])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      const start = touchStart.current
      if (start) {
        const dist = Math.hypot(t.clientX - start.x, t.clientY - start.y)
        if (dist > 8) { clearLongPress(); touchDragging.current = true }
      }
      if (touchDragging.current) {
        const prev = prevCentroid.current
        prevCentroid.current = { x: t.clientX, y: t.clientY }
        if (prev) {
          const dx = (prev.x - t.clientX) * 2
          const dy = (prev.y - t.clientY) * 2
          onInput({ event: 'scroll', dx: Math.round(dx), dy: Math.round(dy) })
        }
      } else {
        prevCentroid.current = { x: t.clientX, y: t.clientY }
      }
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1]
      const cx = (t0.clientX + t1.clientX) / 2, cy = (t0.clientY + t1.clientY) / 2
      if (prevCentroid.current) {
        const sdx = (prevCentroid.current.x - cx) * 2
        const sdy = (prevCentroid.current.y - cy) * 2
        if (Math.abs(sdx) > 0.5 || Math.abs(sdy) > 0.5) {
          onInput({ event: 'scroll', dx: Math.round(sdx), dy: Math.round(sdy) })
        }
      }
      prevCentroid.current = { x: cx, y: cy }
    }
  }, [toRemote, onInput, moveCursor])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    clearLongPress()
    if (!twoFingerUsed.current && touchStart.current && e.changedTouches.length >= 1) {
      const t = e.changedTouches[0]
      const dist = Math.hypot(t.clientX - touchStart.current.x, t.clientY - touchStart.current.y)
      if (dist < 10) {
        const [rx, ry] = toRemote(t.clientX, t.clientY)
        onInput({ event: 'mousemove', x: rx, y: ry })
        onInput({ event: 'mousedown', x: rx, y: ry, button: 0 })
        onInput({ event: 'mouseup', x: rx, y: ry, button: 0 })
        if (isMobile) setToolbarVisible(true)
      }
    }
    if (e.touches.length === 0) {
      touchStart.current = null
      prevCentroid.current = null
      prevPinchDist.current = null
      touchDragging.current = false
      twoFingerUsed.current = false
      moveCursor(0, 0, false)
    }
  }, [toRemote, onInput, moveCursor, setToolbarVisible])

  // 键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    onInput({ event: 'keydown', key: e.key, code: e.code, mods: getMods(e.nativeEvent) })
  }, [onInput, getMods])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    onInput({ event: 'keyup', key: e.key, code: e.code, mods: getMods(e.nativeEvent) })
  }, [onInput, getMods])

  const handleKbKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Unidentified') return
    e.preventDefault()
    const mods = getActiveMods()
    onInput({ event: 'keydown', key: e.key, code: e.code, mods })
    onInput({ event: 'keyup', key: e.key, code: e.code, mods })
    if (activeMods.size > 0) clearMods()
  }, [onInput, getActiveMods, activeMods, clearMods])

  const handleKbInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const text = input.value
    if (!text) return
    input.value = ''
    const mods = getActiveMods()
    if (activeMods.size > 0) clearMods()
    const parts = text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        if (mods.length > 0) {
          for (const ch of parts[i]) {
            const upper = ch.toUpperCase()
            const code = /^[a-zA-Z]$/.test(ch) ? `Key${upper}` : /^[0-9]$/.test(ch) ? `Digit${ch}` : ch === ' ' ? 'Space' : ch
            onInput({ event: 'keydown', key: ch, code, mods } as any)
            onInput({ event: 'keyup', key: ch, code, mods } as any)
          }
        } else {
          onInput({ event: 'paste_text', text: parts[i] } as any)
        }
      }
      if (i < parts.length - 1) {
        onInput({ event: 'keydown', key: 'Enter', code: 'Enter', mods } as any)
        onInput({ event: 'keyup', key: 'Enter', code: 'Enter', mods } as any)
      }
    }
  }, [onInput, getActiveMods, activeMods, clearMods])

  const sendSpecialKey = useCallback((key: string, code: string) => {
    const mods = getActiveMods()
    onInput({ event: 'keydown', key, code, mods } as any)
    onInput({ event: 'keyup', key, code, mods } as any)
    if (activeMods.size > 0) clearMods()
    kbInputRef.current?.focus()
  }, [onInput, getActiveMods, activeMods, clearMods])

  const toggleModifier = useCallback((mod: string) => {
    setActiveMods(prev => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod); else next.add(mod)
      return next
    })
    kbInputRef.current?.focus()
  }, [])

  const toggleKeyboard = useCallback(() => {
    const input = kbInputRef.current
    setShowKb(v => {
      const next = !v
      if (!next) { input?.blur(); setActiveMods(new Set()) }
      return next
    })
    if (input) input.focus()
  }, [])

  // 粘贴
  const onPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (text) onInput({ event: 'paste_text', text } as any)
  }, [onInput])

  const sendClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onInput({ event: 'paste_text', text } as any)
    } catch {
      const text = window.prompt(t('paste_prompt'))
      if (text) onInput({ event: 'paste_text', text } as any)
    }
  }, [onInput, t])

  // 工具栏按钮
  const toolButtons: ToolButton[] = [
    { id: 'keyboard', icon: '⌨️', label: '键盘' },
    { id: 'screenshot', icon: '📷', label: '截屏' },
    { id: 'clipboard', icon: '📋', label: '粘贴' },
    { id: 'reboot', icon: '🔄', label: '重启' },
    { id: 'ctrl', icon: swapCtrlCmd ? '⌘' : 'Ctrl', label: 'Ctrl⇄⌘', active: swapCtrlCmd },
  ]

  const handleToolClick = (id: string) => {
    switch (id) {
      case 'keyboard':
        if (isMobile) toggleKeyboard()
        break
      case 'screenshot':
        // 截图功能
        break
      case 'clipboard':
        sendClipboard()
        break
      case 'reboot':
        onInput({ event: 'reboot' } as any)
        break
      case 'ctrl':
        setSwapCtrlCmd(v => !v)
        break
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* 向日葵风格顶部工具栏 */}
      <div style={{
        ...styles.toolbar,
        transform: toolbarVisible ? 'none' : 'translateY(-100%)',
        pointerEvents: toolbarVisible ? undefined : 'none',
      }}>
        {/* 左侧：设备信息 */}
        <div style={styles.toolbarLeft}>
          <div style={styles.deviceBadge}>
            <span style={styles.deviceIcon}>💻</span>
            <span style={styles.deviceName}>{deviceName}</span>
          </div>
          <div style={styles.connectionStatus}>
            <span style={{
              ...styles.statusDot,
              background: connectionQuality === 'excellent' ? COLORS.success : 
                         connectionQuality === 'good' ? COLORS.warning : COLORS.error
            }} />
            <span style={styles.statusText}>
              {connectionQuality === 'excellent' ? '连接良好' : 
               connectionQuality === 'good' ? '连接一般' : '连接较差'}
            </span>
          </div>
        </div>

        {/* 中间：工具按钮 */}
        <div style={styles.toolbarCenter}>
          {toolButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => handleToolClick(btn.id)}
              style={{
                ...styles.toolBtn,
                ...(btn.active ? styles.toolBtnActive : {})
              }}
              title={btn.label}
            >
              <span style={styles.toolBtnIcon}>{btn.icon}</span>
              <span style={styles.toolBtnLabel}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* 右侧：操作按钮 */}
        <div style={styles.toolbarRight}>
          <button
            onClick={() => setToolbarVisible(false)}
            style={styles.hideBtn}
            title="隐藏工具栏"
          >
            ▲
          </button>
          <button
            onClick={() => setShowDisconnectDlg(true)}
            style={styles.disconnectBtn}
          >
            断开连接
          </button>
        </div>
      </div>

      {/* 工具栏显示按钮 */}
      {!toolbarVisible && (
        <div
          onClick={() => { setToolbarVisible(true); resetHideTimer() }}
          style={styles.showToolbar}
        >
          ▼ 显示工具栏
        </div>
      )}

      {/* 移动端修饰键行 */}
      {isMobile && showKb && (
        <div style={styles.modRow}>
          <div style={styles.modRowInner}>
            {(['ctrl', 'shift', 'alt', 'meta'] as const).map(mod => (
              <ModKey key={mod}
                label={mod === 'meta' ? 'Cmd' : mod === 'ctrl' ? 'Ctrl' : mod === 'shift' ? 'Shift' : 'Alt'}
                active={activeMods.has(mod)}
                onTap={() => toggleModifier(mod)} />
            ))}
            <div style={styles.modSep} />
            <ModKey label="Tab" onTap={() => sendSpecialKey('Tab', 'Tab')} />
            <ModKey label="Esc" onTap={() => sendSpecialKey('Escape', 'Escape')} />
            <ModKey label="Del" onTap={() => sendSpecialKey('Delete', 'Delete')} />
            <ModKey label="`" onTap={() => sendSpecialKey('`', 'Backquote')} />
            <ModKey label="Space" onTap={() => sendSpecialKey(' ', 'Space')} />
            <div style={styles.modSep} />
            <ModKey label="←" onTap={() => sendSpecialKey('ArrowLeft', 'ArrowLeft')} />
            <ModKey label="↑" onTap={() => sendSpecialKey('ArrowUp', 'ArrowUp')} />
            <ModKey label="↓" onTap={() => sendSpecialKey('ArrowDown', 'ArrowDown')} />
            <ModKey label="→" onTap={() => sendSpecialKey('ArrowRight', 'ArrowRight')} />
            <div style={styles.modSep} />
            <ModKey label="Home" onTap={() => sendSpecialKey('Home', 'Home')} />
            <ModKey label="End" onTap={() => sendSpecialKey('End', 'End')} />
          </div>
        </div>
      )}

      {/* 视频区域 */}
      <div style={styles.videoWrapper} onMouseMove={resetHideTimer}>
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay playsInline muted
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
          onContextMenu={onContextMenu}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={onPaste}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseEnter={() => { videoRef.current?.focus() }}
          onMouseLeave={() => { videoRef.current?.blur(); moveCursor(0, 0, false) }}
          tabIndex={0}
        />
        <div ref={cursorRef} style={styles.cursor} />
        {!videoStream && (
          <div style={styles.waiting}>
            <div style={styles.waitingSpinner}>⟳</div>
            <div>{t('connecting_webrtc')}</div>
          </div>
        )}
      </div>

      {/* 移动端虚拟键盘输入 */}
      {isMobile && (
        <input
          ref={kbInputRef}
          style={styles.hiddenInput}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={handleKbKeyDown}
          onInput={handleKbInput}
          onBlur={() => { setShowKb(false); setActiveMods(new Set()) }}
        />
      )}

      {/* 移动端手势提示 */}
      {isMobile && videoStream && <MobileHint />}

      {/* 断开连接确认 */}
      {showDisconnectDlg && (
        <div style={styles.dlgOverlay} onClick={() => setShowDisconnectDlg(false)}>
          <div style={styles.dlgBox} onClick={e => e.stopPropagation()}>
            <div style={styles.dlgTitle}>断开连接</div>
            <div style={styles.dlgBody}>确定要断开与 {deviceName} 的远程连接吗？</div>
            <div style={styles.dlgActions}>
              <button style={styles.dlgCancel} onClick={() => setShowDisconnectDlg(false)}>
                取消
              </button>
              <button style={styles.dlgConfirm} onClick={onDisconnect}>
                断开连接
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 修饰键组件
function ModKey({ label, active = false, onTap }: { label: string; active?: boolean; onTap: () => void }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onTap}
      style={{
        padding: '5px 10px',
        margin: '0 2px',
        borderRadius: 5,
        border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
        background: active ? COLORS.primaryBg : COLORS.surface2,
        color: active ? COLORS.primary : COLORS.text2,
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >{label}</button>
  )
}

// 移动端手势提示
function MobileHint() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('rc_hint_seen'))
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => { sessionStorage.setItem('rc_hint_seen', '1'); setVisible(false) }, 4000)
    return () => clearTimeout(t)
  }, [visible])
  if (!visible) return null
  return (
    <div style={styles.hint} onClick={() => setVisible(false)}>
      <div style={styles.hintBox}>
        <div>单击点击 | 长按右键菜单</div>
        <div>单指滚动 | 双指快速滚动</div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative', height: '100%', background: '#1a1a1a', overflow: 'hidden',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  // 顶部工具栏
  toolbar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 16px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.2s ease',
  },
  toolbarLeft: {
    display: 'flex', alignItems: 'center', gap: 16,
  },
  deviceBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.1)',
    padding: '6px 12px',
    borderRadius: 20,
  },
  deviceIcon: {
    fontSize: 16,
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 500,
  },
  connectionStatus: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%',
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  toolbarCenter: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  toolBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    minWidth: 56,
    transition: 'all 0.15s',
  },
  toolBtnActive: {
    background: COLORS.primaryBg,
    border: `1px solid ${COLORS.primary}`,
  },
  toolBtnIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  toolBtnLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.9,
  },
  toolbarRight: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  hideBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#FFFFFF',
    padding: '6px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
  },
  disconnectBtn: {
    background: COLORS.error,
    border: 'none',
    color: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  showToolbar: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    zIndex: 20, cursor: 'pointer',
    background: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    padding: '6px 16px',
    borderRadius: '0 0 8px 8px',
    fontSize: 12,
  },
  // 修饰键行
  modRow: {
    position: 'absolute', left: 0, right: 0, zIndex: 9,
    background: 'rgba(0,0,0,0.9)',
    overflowX: 'auto',
    top: 56,
  },
  modRowInner: {
    display: 'flex', alignItems: 'center', padding: '5px 8px',
    width: 'max-content',
  },
  modSep: {
    width: 1, height: 20, background: COLORS.border,
    margin: '0 6px', flexShrink: 0,
  },
  // 视频区域
  videoWrapper: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#000',
  },
  video: {
    width: '100%', height: '100%', objectFit: 'contain',
    cursor: 'none', outline: 'none', touchAction: 'none',
  },
  cursor: {
    display: 'none', position: 'absolute', width: 14, height: 14,
    marginLeft: -7, marginTop: -7, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 0 0 1px #000, inset 0 0 0 1px #000',
    pointerEvents: 'none', zIndex: 10,
  },
  waiting: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: 'rgba(255,255,255,0.7)', fontSize: 14,
    gap: 12,
  },
  waitingSpinner: {
    fontSize: 32,
    animation: 'spin 1s linear infinite',
  },
  hiddenInput: {
    position: 'fixed', left: '-9999px', top: 0,
    width: 1, height: 1, opacity: 0,
  },
  hint: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'center', paddingBottom: 40, pointerEvents: 'none', zIndex: 20,
  },
  hintBox: {
    background: 'rgba(0,0,0,0.85)',
    color: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '12px 20px',
    fontSize: 13, lineHeight: 1.8, textAlign: 'center' as const,
    backdropFilter: 'blur(8px)',
  },
  // 弹窗
  dlgOverlay: {
    position: 'absolute' as const, inset: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  },
  dlgBox: {
    background: COLORS.surface, borderRadius: 12,
    padding: '24px', minWidth: 280, maxWidth: 340,
  },
  dlgTitle: {
    fontSize: 16, fontWeight: 600, color: COLORS.text1, marginBottom: 8,
  },
  dlgBody: {
    fontSize: 14, color: COLORS.text2, marginBottom: 20, lineHeight: 1.5,
  },
  dlgActions: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
  },
  dlgCancel: {
    background: COLORS.surface2, color: COLORS.text2,
    border: 'none', borderRadius: 6,
    padding: '8px 20px', fontSize: 14, cursor: 'pointer',
  },
  dlgConfirm: {
    background: COLORS.error, color: '#FFFFFF',
    border: 'none', borderRadius: 6,
    padding: '8px 20px', fontSize: 14, cursor: 'pointer', fontWeight: 500,
  },
}
