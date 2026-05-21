import { useEffect, useRef, useState } from 'react'

export interface HistoryEntry {
  deviceID: string
  password: string
  serverURL: string
  ts: number
}

const HISTORY_KEY = 'rc_history'
const MAX_HISTORY = 20

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const filtered = history.filter(
    h => !(h.deviceID === entry.deviceID && h.serverURL === entry.serverURL)
  )
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

interface Props {
  onConnect: (serverURL: string, deviceID: string, password: string) => void
  error: string
  connecting: boolean
  history: HistoryEntry[]
  onRemoveHistory: (deviceID: string, serverURL: string) => void
}

// 向日葵风格的主色调
const COLORS = {
  primary: '#FF7A00',      // 橙色主色
  primaryDark: '#E66A00',  // 深橙色
  primaryLight: '#FF9A33', // 浅橙色
  primaryBg: 'rgba(255, 122, 0, 0.1)',
  primaryBorder: 'rgba(255, 122, 0, 0.3)',
  surface: '#FFFFFF',
  surface2: '#F5F5F5',
  surface3: '#EBEBEB',
  border: '#E0E0E0',
  border2: '#D0D0D0',
  text1: '#333333',
  text2: '#666666',
  text3: '#999999',
  success: '#52C41A',
  error: '#FF4D4F',
}

export default function ConnectPanel({ onConnect, error, connecting, history, onRemoveHistory }: Props) {
  const [serverURL, setServerURL] = useState(() => localStorage.getItem('rc_server') ?? 'http://localhost:8080')
  const [deviceID, setDeviceID] = useState(() => localStorage.getItem('rc_device') ?? '')
  const [password, setPassword] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<HistoryEntry | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [pendingRemove, setPendingRemove] = useState<{ deviceID: string; serverURL: string } | null>(null)

  useEffect(() => { localStorage.setItem('rc_server', serverURL) }, [serverURL])
  useEffect(() => { localStorage.setItem('rc_device', deviceID) }, [deviceID])

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    onConnect(serverURL, deviceID, password)
  }

  const handleAddDevice = () => {
    setSelectedDevice(null)
    setDeviceID('')
    setPassword('')
    setShowAddForm(true)
  }

  const handleSelectDevice = (entry: HistoryEntry) => {
    setSelectedDevice(entry)
    setServerURL(entry.serverURL)
    setDeviceID(entry.deviceID)
    setPassword(entry.password)
    setShowAddForm(true)
  }

  return (
    <div style={styles.container}>
      {/* 左侧设备列表 */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🖥</span>
            <span style={styles.logoText}>RemoteCtl</span>
          </div>
        </div>
        
        <div style={styles.deviceList}>
          <div style={styles.deviceListTitle}>
            <span>我的设备</span>
            <span style={styles.deviceCount}>{history.length}</span>
          </div>
          
          {history.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📱</div>
              <div style={styles.emptyText}>暂无已保存的设备</div>
              <div style={styles.emptyHint}>连接设备后将自动保存</div>
            </div>
          ) : (
            history.map(entry => (
              <div
                key={`${entry.serverURL}|${entry.deviceID}`}
                onClick={() => handleSelectDevice(entry)}
                style={{
                  ...styles.deviceItem,
                  ...(selectedDevice?.deviceID === entry.deviceID ? styles.deviceItemActive : {})
                }}
              >
                <div style={styles.deviceIcon}>💻</div>
                <div style={styles.deviceInfo}>
                  <div style={styles.deviceName}>{entry.deviceID}</div>
                  <div style={styles.deviceServer}>{entry.serverURL.replace(/^https?:\/\//, '')}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPendingRemove({ deviceID: entry.deviceID, serverURL: entry.serverURL }) }}
                  style={styles.deleteBtn}
                  title="删除"
                >×</button>
              </div>
            ))
          )}
        </div>
        
        <div style={styles.sidebarFooter}>
          <button onClick={handleAddDevice} style={styles.addBtn}>
            <span>+</span> 添加设备
          </button>
        </div>
      </div>

      {/* 右侧连接区域 */}
      <div style={styles.main}>
        {showAddForm ? (
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>
                {selectedDevice ? '连接设备' : '添加设备'}
              </h2>
              <div style={styles.formSubtitle}>
                {selectedDevice ? `正在连接: ${selectedDevice.deviceID}` : '输入设备信息以建立远程连接'}
              </div>
            </div>

            <form onSubmit={handleConnect} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>服务器地址</label>
                <input
                  style={styles.input}
                  value={serverURL}
                  onChange={e => setServerURL(e.target.value)}
                  placeholder="https://your-server.com"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>设备识别码</label>
                <input
                  style={{...styles.input, ...styles.inputMono}}
                  value={deviceID}
                  onChange={e => setDeviceID(e.target.value)}
                  placeholder="输入9位识别码"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>验证码</label>
                <input
                  ref={passwordRef}
                  style={styles.input}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入6位验证码"
                  required
                />
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {error}
                </div>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={styles.cancelBtn}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  style={{
                    ...styles.connectBtn,
                    ...(connecting ? styles.connectBtnDisabled : {})
                  }}
                >
                  {connecting ? (
                    <>
                      <span style={styles.spinner}>⟳</span>
                      连接中...
                    </>
                  ) : (
                    <>🖥️ 远程连接</>
                  )}
                </button>
              </div>
            </form>

            <div style={styles.tips}>
              <div style={styles.tipsTitle}>💡 连接提示</div>
              <ul style={styles.tipsList}>
                <li>被控端需要运行 Agent 并保持在线</li>
                <li>识别码和验证码在被控端界面查看</li>
                <li>首次连接需要对方确认</li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={styles.welcomeContainer}>
            <div style={styles.welcomeIcon}>🖥️</div>
            <h2 style={styles.welcomeTitle}>欢迎使用 RemoteCtl</h2>
            <p style={styles.welcomeText}>选择左侧列表中的设备快速连接，或添加新设备开始远程控制</p>
            <button onClick={handleAddDevice} style={styles.startBtn}>
              <span>+</span> 添加新设备
            </button>
            
            <div style={styles.featureGrid}>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>🔒</div>
                <div style={styles.featureName}>端到端加密</div>
                <div style={styles.featureDesc}>数据全程加密传输</div>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>⚡</div>
                <div style={styles.featureName}>低延迟</div>
                <div style={styles.featureDesc}>P2P直连，延迟低于50ms</div>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>🌐</div>
                <div style={styles.featureName}>跨网络</div>
                <div style={styles.featureDesc}>支持局域网易网络远程</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {pendingRemove && (
        <div style={styles.modalOverlay} onClick={() => setPendingRemove(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>确认删除</div>
            <div style={styles.modalBody}>
              确定要删除设备 <strong>{pendingRemove.deviceID}</strong> 的记录吗？
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setPendingRemove(null)} style={styles.modalCancel}>
                取消
              </button>
              <button
                onClick={() => { onRemoveHistory(pendingRemove.deviceID, pendingRemove.serverURL); setPendingRemove(null) }}
                style={styles.modalDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    background: '#F0F2F5',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  // 侧边栏
  sidebar: {
    width: 280,
    background: '#FFFFFF',
    borderRight: '1px solid #E8E8E8',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '20px 16px',
    borderBottom: '1px solid #E8E8E8',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.primary,
  },
  deviceList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  deviceListTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    fontSize: 12,
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  deviceCount: {
    background: COLORS.surface2,
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text2,
    fontSize: 14,
    marginBottom: 4,
  },
  emptyHint: {
    color: COLORS.text3,
    fontSize: 12,
  },
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    borderBottom: '1px solid #F5F5F5',
  },
  deviceItemActive: {
    background: COLORS.primaryBg,
    borderLeft: `3px solid ${COLORS.primary}`,
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.text1,
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deviceServer: {
    fontSize: 11,
    color: COLORS.text3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    border: 'none',
    background: 'transparent',
    color: COLORS.text3,
    fontSize: 18,
    cursor: 'pointer',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarFooter: {
    padding: 16,
    borderTop: '1px solid #E8E8E8',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    background: COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // 主区域
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    background: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    padding: 32,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.text1,
    margin: '0 0 8px 0',
  },
  formSubtitle: {
    fontSize: 13,
    color: COLORS.text3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.text2,
  },
  input: {
    padding: '12px 14px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    background: COLORS.surface,
  },
  inputMono: {
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    background: '#FFF2F0',
    border: '1px solid #FFCCC7',
    borderRadius: 8,
    color: COLORS.error,
    fontSize: 13,
  },
  errorIcon: {
    fontSize: 14,
  },
  formActions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: COLORS.surface2,
    color: COLORS.text2,
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  connectBtn: {
    flex: 2,
    padding: '12px',
    background: COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  connectBtnDisabled: {
    background: COLORS.text3,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  tips: {
    marginTop: 24,
    padding: 16,
    background: COLORS.surface2,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.text2,
    marginBottom: 8,
  },
  tipsList: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 12,
    color: COLORS.text3,
    lineHeight: 1.8,
  },
  // 欢迎页面
  welcomeContainer: {
    textAlign: 'center',
    maxWidth: 480,
  },
  welcomeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: COLORS.text1,
    margin: '0 0 12px 0',
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.text2,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  startBtn: {
    padding: '14px 32px',
    background: COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
    marginTop: 48,
  },
  featureItem: {
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureName: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.text1,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.text3,
  },
  // 弹窗
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.text1,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    color: COLORS.text2,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    padding: '8px 20px',
    background: COLORS.surface2,
    color: COLORS.text2,
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  modalDelete: {
    padding: '8px 20px',
    background: COLORS.error,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
}
