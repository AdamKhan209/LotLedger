import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
import {
  LayoutDashboard, Car, FileText, Settings, Search, Plus,
  TrendingUp, DollarSign, Clock, Package,
  ChevronRight, ArrowUpRight, Download,
  Wrench, Truck, Receipt, Calendar, AlertCircle, CheckCircle2,
  X, Edit3, ChevronLeft, Tag, Trash2, Sun, Moon,
  Building2, User, Palette, Save, Upload, FileSpreadsheet
} from 'lucide-react';

// ─── Theme context ────────────────────────────────────────────
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

const THEMES = {
  light: {
    name: 'light',
    bg: '#faf9f6',
    surface: '#ffffff',
    surfaceMuted: '#f5f5f4',
    border: '#e7e5e4',
    borderSubtle: '#f5f5f4',
    text: '#1c1917',
    textMuted: '#78716c',
    textSubtle: '#a8a29e',
    sidebar: '#0f1e18',
    sidebarText: '#e7e5e4',
    sidebarMuted: '#78716c',
    primaryBg: '#0f1e18',
    primaryBgHover: '#1a3a2e',
    primaryText: '#ffffff',
    accent: '#059669',
  },
  dark: {
    name: 'dark',
    bg: '#0a0f0d',
    surface: '#141a17',
    surfaceMuted: '#1c2420',
    border: '#2a332e',
    borderSubtle: '#1c2420',
    text: '#e7e5e4',
    textMuted: '#a8a29e',
    textSubtle: '#78716c',
    sidebar: '#070a09',
    sidebarText: '#e7e5e4',
    sidebarMuted: '#78716c',
    primaryBg: '#10b981',
    primaryBgHover: '#34d399',
    primaryText: '#0a0f0d',
    accent: '#10b981',
  }
};

// ─── Persistence helpers ──────────────────────────────────────
const STORAGE_KEY = 'lotledger-state-v1';
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};
const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
};

// ─── Seed data ────────────────────────────────────────────────
const mkCost = (label, amount, type = 'custom', name = '') => ({
  id: Math.random().toString(36).slice(2, 9),
  label, amount, type, name
});


const defaultDealer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  userName: '',
};

// ─── Cost math ────────────────────────────────────────────────
const calcCosts = (v) => {
  const totalCost = (v.costs || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const projectedGross = v.askingPrice - totalCost;
  const grossMargin = v.askingPrice > 0 ? (projectedGross / v.askingPrice) * 100 : 0;
  return { totalCost, projectedGross, grossMargin };
};

const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

const iconForLabel = (label) => {
  const l = (label || '').toLowerCase();
  if (l.includes('purchase')) return DollarSign;
  if (l.includes('added')) return Package;
  if (l.includes('labor')) return Wrench;
  if (l.includes('transport') || l.includes('ship') || l.includes('haul')) return Truck;
  if (l.includes('detail') || l.includes('clean')) return Package;
  if (l.includes('tire')) return Package;
  return Receipt;
};

// ─── PDF export ────────────────────────────────────────────────
const ensureJsPdf = () => new Promise((resolve, reject) => {
  if (window.jspdf) { resolve(window.jspdf); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = () => resolve(window.jspdf);
  s.onerror = () => reject(new Error('Failed to load jsPDF'));
  document.head.appendChild(s);
});

const exportInventoryPDF = async (vehicles, dealerName) => {
  try {
    const { jsPDF } = await ensureJsPdf();
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 30, 24);
    doc.text('LotLedger', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('Inventory Report', margin, y + 14);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, pageW - margin, y, { align: 'right' });
    doc.text(dealerName || 'Reyes Auto Group', pageW - margin, y + 14, { align: 'right' });
    y += 40;

    doc.setDrawColor(231, 229, 228);
    doc.line(margin, y, pageW - margin, y);
    y += 20;

    const totals = vehicles.reduce((a, v) => {
      const c = calcCosts(v);
      a.cost += c.totalCost; a.asking += v.askingPrice; a.gross += c.projectedGross;
      return a;
    }, { cost: 0, asking: 0, gross: 0 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text('Summary', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    [
      [`Total units:`, `${vehicles.length}`],
      [`Inventory cost basis:`, fmt(totals.cost)],
      [`Asking total:`, fmt(totals.asking)],
      [`Projected gross:`, fmt(totals.gross)],
    ].forEach(([k, v]) => {
      doc.text(k, margin, y);
      doc.text(v, margin + 150, y);
      y += 14;
    });
    y += 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    const cols = [
      { x: margin, label: 'STOCK #' },
      { x: margin + 60, label: 'VEHICLE' },
      { x: margin + 230, label: 'DAYS', align: 'right' },
      { x: margin + 290, label: 'COST', align: 'right' },
      { x: margin + 370, label: 'ASKING', align: 'right' },
      { x: margin + 450, label: 'GROSS', align: 'right' },
    ];
    cols.forEach(c => doc.text(c.label, c.x, y, { align: c.align || 'left' }));
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);

    vehicles.forEach(v => {
      if (y > 720) { doc.addPage(); y = margin; }
      const c = calcCosts(v);
      doc.text(v.id, cols[0].x, y);
      doc.text(`${v.year} ${v.make} ${v.model}`.slice(0, 30), cols[1].x, y);
      doc.text(String(v.daysInStock), cols[2].x, y, { align: 'right' });
      doc.text(fmt(c.totalCost), cols[3].x, y, { align: 'right' });
      doc.text(fmt(v.askingPrice), cols[4].x, y, { align: 'right' });
      doc.text(fmt(c.projectedGross), cols[5].x, y, { align: 'right' });
      y += 16;
    });

    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`Generated by LotLedger · ${new Date().toLocaleString()}`, margin, y);

    doc.save(`lotledger-inventory-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (e) {
    alert('Could not generate PDF: ' + e.message);
  }
};

// ─── Themed primitives ────────────────────────────────────────
const StatusChip = ({ status }) => {
  const { theme } = useTheme();
  const isDark = theme.name === 'dark';
  const config = {
    available: { bg: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5', text: isDark ? '#6ee7b7' : '#065f46', dot: '#10b981', label: 'Available' },
    reconditioning: { bg: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb', text: isDark ? '#fcd34d' : '#92400e', dot: '#f59e0b', label: 'In Recon' },
    sold: { bg: isDark ? 'rgba(168,162,158,0.15)' : '#f5f5f4', text: isDark ? '#d6d3d1' : '#44403c', dot: '#a8a29e', label: 'Sold' },
  }[status] || { bg: '#f5f5f4', text: '#44403c', dot: '#a8a29e', label: status };
  return (
    <span style={{ background: config.bg, color: config.text }} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
};

const Card = ({ children, className = '', style = {} }) => {
  const { theme } = useTheme();
  return (
    <div className={`rounded-xl border ${className}`} style={{ background: theme.surface, borderColor: theme.border, ...style }}>
      {children}
    </div>
  );
};

// Themed buttons — using inline style so they render regardless of Tailwind config
const PrimaryBtn = ({ onClick, children, icon: Icon, type = 'button' }) => {
  const { theme } = useTheme();
  return (
    <button
      type={type}
      onClick={onClick}
      className="px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5"
      style={{ background: theme.primaryBg, color: theme.primaryText }}
      onMouseEnter={e => e.currentTarget.style.background = theme.primaryBgHover}
      onMouseLeave={e => e.currentTarget.style.background = theme.primaryBg}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

const PrimaryBtnLg = ({ onClick, children, icon: Icon }) => {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 text-sm font-semibold rounded-md transition flex items-center gap-1.5"
      style={{ background: theme.primaryBg, color: theme.primaryText }}
      onMouseEnter={e => e.currentTarget.style.background = theme.primaryBgHover}
      onMouseLeave={e => e.currentTarget.style.background = theme.primaryBg}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

const SecondaryBtn = ({ onClick, children, icon: Icon }) => {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs font-medium rounded-md transition flex items-center gap-1.5"
      style={{ color: theme.textMuted, background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

const GhostBtn = ({ onClick, children }) => {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm rounded-md transition"
      style={{ color: theme.textMuted, background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────
const Sidebar = ({ active, setActive, onAddVehicle, dealer }) => {
  const { theme } = useTheme();
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Car },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const initials = (dealer.userName || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0" style={{ background: theme.sidebar, color: theme.sidebarText }}>
      <div className="px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #34d399, #047857)', boxShadow: '0 10px 15px -3px rgba(6,78,59,0.4)' }}>
            <span style={{ fontFamily: 'Fraunces, serif', color: '#0f1e18' }} className="font-black text-lg italic">L</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-semibold tracking-tight leading-none">LotLedger</div>
            <div className="text-[10px] mt-0.5 tracking-widest uppercase" style={{ color: theme.sidebarMuted }}>Dealer OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[10px] uppercase tracking-widest px-3 py-2" style={{ color: theme.sidebarMuted }}>Workspace</div>
        {nav.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all"
              style={{
                background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: isActive ? '#6ee7b7' : theme.sidebarMuted,
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = theme.sidebarText; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.sidebarMuted; } }}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span className="font-medium">{item.label}</span>
              {isActive && <span className="ml-auto w-1 h-4 bg-emerald-400 rounded-full" />}
            </button>
          );
        })}

        <div className="pt-6">
          <div className="text-[10px] uppercase tracking-widest px-3 py-2" style={{ color: theme.sidebarMuted }}>Quick action</div>
          <button
            onClick={onAddVehicle}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold transition"
            style={{ background: '#10b981', color: '#0f1e18', boxShadow: '0 10px 15px -3px rgba(6,78,59,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#34d399'}
            onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Vehicle
          </button>
        </div>
      </nav>

      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setActive('settings')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Go to Settings"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fcd34d, #d97706)', color: '#0f1e18' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: theme.sidebarText }}>{dealer.userName}</div>
            <div className="text-[10px] truncate" style={{ color: theme.sidebarMuted }}>{dealer.name}</div>
          </div>
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ title, subtitle, children }) => {
  const { theme } = useTheme();
  return (
    <div className="flex items-end justify-between mb-8 pt-2">
      <div>
        <h1 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-4xl font-light tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && <p className="text-sm mt-2" style={{ color: theme.textMuted }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────
const Dashboard = ({ vehicles, onSelectVehicle, dealer }) => {
  const { theme } = useTheme();
  const totals = useMemo(() => {
    const t = vehicles.reduce((acc, v) => {
      const c = calcCosts(v);
      acc.totalValue += c.totalCost;
      acc.askingTotal += v.askingPrice;
      acc.projectedGross += c.projectedGross;
      acc.daysInStockSum += v.daysInStock;
      if (v.daysInStock > 60) acc.aged += 1;
      return acc;
    }, { totalValue: 0, askingTotal: 0, projectedGross: 0, daysInStockSum: 0, aged: 0 });
    t.avgDays = vehicles.length ? Math.round(t.daysInStockSum / vehicles.length) : 0;
    return t;
  }, [vehicles]);

  const aged = vehicles.filter(v => v.daysInStock > 60);
  const avgMargin = totals.askingTotal > 0 ? Math.round((totals.projectedGross / totals.askingTotal) * 100) : 0;
  const firstName = (dealer.userName || 'there').split(' ')[0];

  return (
    <div>
      <TopBar title="Dashboard" subtitle={`Good afternoon, ${firstName}. Here's where the lot stands today.`}>
        <SecondaryBtn icon={Calendar}>May 2026</SecondaryBtn>
      </TopBar>

      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8 border" style={{ background: theme.border, borderColor: theme.border }}>
        <MetricCell label="Inventory cost basis" value={fmt(totals.totalValue)} accent={<><ArrowUpRight size={12} /> across {vehicles.length} units</>} mono />
        <MetricCell label="Projected gross" value={fmt(totals.projectedGross)} accent={<><ArrowUpRight size={12} /> {avgMargin}% avg margin</>} mono />
        <MetricCell label="Asking total" value={fmt(totals.askingTotal)} accent={<>Combined sticker value</>} muted mono />
        <MetricCell label="Avg. days in stock" value={`${totals.avgDays}d`} accent={<><AlertCircle size={12} /> {totals.aged} units aged 60+</>} accentColor={totals.aged > 2 ? "#b45309" : theme.textMuted} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
            <div>
              <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Aged inventory</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Vehicles sitting longer than 60 days.</p>
            </div>
            <span className="text-xs" style={{ color: theme.textSubtle }}>{aged.length} units</span>
          </div>
          <div>
            {aged.map((v, i) => {
              const c = calcCosts(v);
              return (
                <button
                  key={v.id}
                  onClick={() => onSelectVehicle(v.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 transition text-left group"
                  style={{ borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.surfaceMuted }}>
                    <Car size={18} strokeWidth={1.5} style={{ color: theme.textMuted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>{v.year} {v.make} {v.model}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: theme.textMuted }}>{v.id} · {v.vin.slice(-8)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium" style={{ color: '#b45309' }}>{v.daysInStock} days</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: theme.textMuted }}>{fmt(c.totalCost)} invested</div>
                  </div>
                  <ChevronRight size={16} style={{ color: theme.textSubtle }} />
                </button>
              );
            })}
            {aged.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: theme.textSubtle }}>
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                No aged units. Lot is fresh.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: '#0f1e18', color: '#e7e5e4' }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-2">This month</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-light tracking-tight">
                {vehicles.length} <span className="text-stone-500 text-2xl">units</span>
              </div>
              <div className="text-sm text-stone-400 mt-1">on the lot</div>
              <div className="h-px bg-white/10 my-4" />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-stone-500">In recon</div>
                  <div className="text-stone-100 font-mono mt-1">{vehicles.filter(v => v.status === 'reconditioning').length}</div>
                </div>
                <div>
                  <div className="text-stone-500">Front line</div>
                  <div className="text-stone-100 font-mono mt-1">{vehicles.filter(v => v.status === 'available').length}</div>
                </div>
              </div>
            </div>
          </div>

          <Card className="p-5">
            <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-base font-medium mb-3">Cost composition</h3>
            <CostBreakdownBar vehicles={vehicles} />
          </Card>
        </div>
      </div>
    </div>
  );
};

const MetricCell = ({ label, value, accent, accentColor, muted, mono }) => {
  const { theme } = useTheme();
  return (
    <div className="p-5" style={{ background: theme.surface }}>
      <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: theme.textMuted }}>{label}</div>
      <div className={`mt-2 text-3xl font-light tracking-tight ${mono ? 'font-mono' : ''}`} style={{ color: theme.text, ...(mono ? {} : { fontFamily: 'Fraunces, serif' }) }}>
        {value}
      </div>
      <div className="text-xs mt-2 flex items-center gap-1" style={{ color: accentColor || (muted ? theme.textMuted : '#047857') }}>
        {accent}
      </div>
    </div>
  );
};

const CostBreakdownBar = ({ vehicles }) => {
  const { theme } = useTheme();
  const totals = {};
  vehicles.forEach(v => {
    (v.costs || []).forEach(c => {
      totals[c.label] = (totals[c.label] || 0) + Number(c.amount || 0);
    });
  });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, val]) => s + val, 0);
  const palette = ['#047857', '#f59e0b', '#fb7185', '#78716c', '#0ea5e9', '#8b5cf6', '#f97316'];

  if (total === 0) return <div className="text-xs" style={{ color: theme.textSubtle }}>No costs logged yet.</div>;

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden" style={{ background: theme.surfaceMuted }}>
        {entries.map(([label, val], i) => (
          <div key={label} style={{ width: `${(val / total) * 100}%`, background: palette[i % palette.length] }} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {entries.map(([label, val], i) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: palette[i % palette.length] }} />
              <span style={{ color: theme.textMuted }}>{label}</span>
            </div>
            <span className="font-mono" style={{ color: theme.text }}>{fmt(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Inventory ────────────────────────────────────────────────
const Inventory = ({ vehicles, dealer, onSelectVehicle, onAddVehicle, onEditVehicle, onRequestDelete, onImportFrazer }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = vehicles.filter(v => {
    const matchSearch = !search || `${v.year} ${v.make} ${v.model} ${v.id} ${v.vin}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <TopBar title="Inventory" subtitle={`${vehicles.length} vehicles tracked · ${vehicles.filter(v => v.status === 'available').length} on the front line`}>
        <SecondaryBtn icon={Upload} onClick={onImportFrazer}>Import from Frazer</SecondaryBtn>
        <SecondaryBtn icon={Download} onClick={() => exportInventoryPDF(vehicles, dealer.name)}>Export PDF</SecondaryBtn>
        <PrimaryBtn icon={Plus} onClick={onAddVehicle}>Add Vehicle</PrimaryBtn>
      </TopBar>

      <Card className="mb-4 p-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textSubtle }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by stock #, VIN, year, make, model…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md focus:outline-none transition"
            style={{ background: theme.surfaceMuted, border: `1px solid ${theme.border}`, color: theme.text }}
            onFocus={e => e.target.style.borderColor = theme.accent}
            onBlur={e => e.target.style.borderColor = theme.border}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md" style={{ background: theme.surfaceMuted }}>
          {['all', 'available', 'reconditioning', 'sold'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-xs font-medium rounded transition capitalize"
              style={{
                background: statusFilter === s ? theme.surface : 'transparent',
                color: statusFilter === s ? theme.text : theme.textMuted,
                boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {s === 'all' ? 'All' : s === 'reconditioning' ? 'In Recon' : s === 'sold' ? 'Sold' : 'Available'}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, background: theme.surfaceMuted + '80' }}>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Vehicle</th>
              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Stock #</th>
              <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Total cost</th>
              <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Asking</th>
              <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Proj. gross</th>
              <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Days</th>
              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Status</th>
              <th className="text-right pr-5 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => {
              const c = calcCosts(v);
              const aged = v.daysInStock > 60;
              return (
                <tr key={v.id} className="transition group"
                  style={{ borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-3.5 cursor-pointer" onClick={() => onSelectVehicle(v.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: theme.surfaceMuted }}>
                        <Car size={15} strokeWidth={1.5} style={{ color: theme.textMuted }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: theme.text }}>{v.year} {v.make} {v.model}</div>
                        <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{v.color} · {v.mileage.toLocaleString()} mi</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs cursor-pointer" style={{ color: theme.textMuted }} onClick={() => onSelectVehicle(v.id)}>{v.id}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-sm cursor-pointer" style={{ color: theme.text }} onClick={() => onSelectVehicle(v.id)}>{fmt(c.totalCost)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-sm cursor-pointer" style={{ color: theme.text }} onClick={() => onSelectVehicle(v.id)}>{fmt(v.askingPrice)}</td>
                  <td className="px-3 py-3.5 text-right cursor-pointer" onClick={() => onSelectVehicle(v.id)}>
                    <div className="font-mono text-sm font-medium" style={{ color: c.projectedGross >= 0 ? '#047857' : '#b91c1c' }}>{fmt(c.projectedGross)}</div>
                    <div className="text-[10px] font-mono" style={{ color: theme.textMuted }}>{c.grossMargin.toFixed(1)}%</div>
                  </td>
                  <td className="px-3 py-3.5 text-right cursor-pointer" onClick={() => onSelectVehicle(v.id)}>
                    <span className="font-mono text-sm" style={{ color: aged ? '#b45309' : theme.text, fontWeight: aged ? 600 : 400 }}>{v.daysInStock}</span>
                  </td>
                  <td className="px-3 py-3.5 cursor-pointer" onClick={() => onSelectVehicle(v.id)}><StatusChip status={v.status} /></td>
                  <td className="pr-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditVehicle(v.id); }}
                        className="p-1.5 rounded-md transition"
                        style={{ color: theme.textSubtle }}
                        onMouseEnter={e => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.surfaceMuted; }}
                        onMouseLeave={e => { e.currentTarget.style.color = theme.textSubtle; e.currentTarget.style.background = 'transparent'; }}
                        title="Edit vehicle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRequestDelete(v.id); }}
                        className="p-1.5 rounded-md transition"
                        style={{ color: theme.textSubtle }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = theme.textSubtle; e.currentTarget.style.background = 'transparent'; }}
                        title="Delete vehicle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm" style={{ color: theme.textSubtle }}>
            No vehicles match your filters.
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Vehicle Detail ───────────────────────────────────────────
const VehicleDetail = ({ vehicle, onBack, onAddCost, onAddCostToCategory, onDeleteCost, onEditVehicle }) => {
  const { theme } = useTheme();
  const c = calcCosts(vehicle);

  // Group costs by label so user can click a category to add more
  const grouped = useMemo(() => {
    const map = {};
    (vehicle.costs || []).forEach(cost => {
      if (!map[cost.label]) map[cost.label] = { label: cost.label, total: 0, type: cost.type, items: [] };
      map[cost.label].total += Number(cost.amount) || 0;
      map[cost.label].items.push(cost);
    });
    return Object.values(map);
  }, [vehicle.costs]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs transition mb-4" style={{ color: theme.textMuted }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
      >
        <ChevronLeft size={14} /> Back to inventory
      </button>

      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs px-2 py-1 rounded" style={{ color: theme.textMuted, background: theme.surfaceMuted }}>{vehicle.id}</span>
            <StatusChip status={vehicle.status} />
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-4xl font-light tracking-tight leading-none">
            {vehicle.year} {vehicle.make} <span className="italic" style={{ color: theme.textMuted }}>{vehicle.model}</span>
          </h1>
          <p className="text-sm mt-2 font-mono" style={{ color: theme.textMuted }}>{vehicle.vin}</p>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryBtn icon={Edit3} onClick={() => onEditVehicle(vehicle.id)}>Edit</SecondaryBtn>
          <PrimaryBtn icon={Plus} onClick={onAddCost}>Add cost</PrimaryBtn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Cost ledger</h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Click any category to add more to it.</p>
              </div>
              <button onClick={onAddCost} className="text-xs font-medium flex items-center gap-1" style={{ color: theme.accent }}>
                <Plus size={12} /> New category
              </button>
            </div>
            <div>
              {grouped.map((g, gi) => {
                const Icon = iconForLabel(g.label);
                const isPurchase = g.type === 'purchase';
                return (
                  <div key={g.label} style={{ borderTop: gi > 0 ? `1px solid ${theme.borderSubtle}` : 'none' }}>
                    <button
                      onClick={() => onAddCostToCategory(vehicle.id, g.label)}
                      className="w-full px-5 py-3.5 flex items-center gap-4 group transition text-left"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title={`Click to add more to ${g.label}`}
                    >
                      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
                        <Icon size={14} strokeWidth={1.75} style={{ color: theme.textMuted }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2" style={{ color: theme.text }}>
                          {g.label}
                          {g.items.length > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: theme.surfaceMuted, color: theme.textMuted }}>
                              {g.items.length} entries
                            </span>
                          )}
                          <Plus size={12} className="opacity-0 group-hover:opacity-100 transition" style={{ color: theme.accent }} />
                        </div>
                        {isPurchase && <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Base acquisition cost</div>}
                        {!isPurchase && g.items.length === 1 && g.items[0].name && g.items[0].name.trim() && (
                          <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{g.items[0].name}</div>
                        )}
                      </div>
                      <div className="font-mono text-sm" style={{ color: theme.text }}>{fmt(g.total)}</div>
                    </button>

                    {/* Show individual entries if there's more than one */}
                    {g.items.length > 1 && (
                      <div style={{ background: theme.surfaceMuted + '50' }}>
                        {g.items.map((item, idx) => {
                          const isOriginal = idx === 0 && !isPurchase;
                          const displayLabel = item.name && item.name.trim()
                            ? item.name
                            : (isOriginal ? 'Original' : `Entry · ${item.id.slice(0, 4)}`);
                          return (
                            <div key={item.id} className="px-5 pl-16 py-2 flex items-center gap-3 group">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: isOriginal ? theme.accent : theme.textSubtle }} />
                              <div className="text-xs flex-1 flex items-center gap-2" style={{ color: theme.textMuted }}>
                                <span>{displayLabel}</span>
                                {isOriginal && (
                                  <span className="text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded" style={{ background: theme.name === 'dark' ? 'rgba(16,185,129,0.15)' : '#ecfdf5', color: theme.accent }}>
                                    Original
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs" style={{ color: theme.textMuted }}>{fmt(item.amount)}</div>
                              {item.type !== 'purchase' && (
                                <button
                                  onClick={() => onDeleteCost(vehicle.id, item.id)}
                                  className="p-1 rounded transition opacity-0 group-hover:opacity-100"
                                  style={{ color: theme.textSubtle }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = theme.textSubtle; e.currentTarget.style.background = 'transparent'; }}
                                  title="Remove entry"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Single-entry delete button shown only on hover of the category row */}
                    {g.items.length === 1 && !isPurchase && (
                      <div className="px-5 py-1 flex justify-end" style={{ marginTop: '-32px', pointerEvents: 'none' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteCost(vehicle.id, g.items[0].id); }}
                          className="p-1 rounded transition opacity-0 hover:opacity-100"
                          style={{ color: theme.textSubtle, pointerEvents: 'auto' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = theme.textSubtle; e.currentTarget.style.background = 'transparent'; }}
                          title="Remove cost"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: theme.surfaceMuted, borderTop: `1px solid ${theme.borderSubtle}` }}>
                <div className="text-sm font-semibold" style={{ color: theme.text }}>Total cost basis</div>
                <div className="font-mono text-lg font-semibold" style={{ color: theme.text }}>{fmt(c.totalCost)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium mb-4">Vehicle details</h3>
            <div className="grid grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <Spec label="Trim" value={vehicle.trim || '—'} />
              <Spec label="Color" value={vehicle.color} />
              <Spec label="Mileage" value={`${vehicle.mileage.toLocaleString()} mi`} mono />
              <Spec label="VIN" value={vehicle.vin} mono />
              <Spec label="Acquired" value={vehicle.acquiredDate} mono />
              <Spec label="Days in stock" value={`${vehicle.daysInStock} days`} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1e18, #1a3a2e)', color: '#e7e5e4' }}>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-3">Projected sale</div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-stone-400">Asking</span>
                <span className="font-mono text-lg">{fmt(vehicle.askingPrice)}</span>
              </div>
              <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-white/10">
                <span className="text-sm text-stone-400">Total cost</span>
                <span className="font-mono text-lg text-stone-300">{fmt(c.totalCost)}</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-1">Projected gross</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className={`text-4xl font-light tracking-tight font-mono ${c.projectedGross < 0 ? 'text-rose-300' : ''}`}>
                {fmt(c.projectedGross)}
              </div>
              <div className={`text-xs mt-1 flex items-center gap-1 ${c.projectedGross < 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
                <TrendingUp size={12} /> {c.grossMargin.toFixed(1)}% margin
              </div>
            </div>
          </div>

          {vehicle.daysInStock > 60 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                <div className="text-xs" style={{ color: theme.name === 'dark' ? '#fcd34d' : '#78350f' }}>
                  <div className="font-semibold mb-0.5">Aging watch</div>
                  This unit has been on the lot for {vehicle.daysInStock} days. Consider a price reduction.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Spec = ({ label, value, mono }) => {
  const { theme } = useTheme();
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>{label}</div>
      <div className={mono ? 'font-mono text-xs' : 'text-sm'} style={{ color: theme.text }}>{value}</div>
    </div>
  );
};

// ─── Reports ──────────────────────────────────────────────────
const Reports = ({ vehicles, dealer }) => {
  const { theme } = useTheme();
  const byMake = vehicles.reduce((acc, v) => {
    const c = calcCosts(v);
    if (!acc[v.make]) acc[v.make] = { count: 0, cost: 0, gross: 0 };
    acc[v.make].count += 1;
    acc[v.make].cost += c.totalCost;
    acc[v.make].gross += c.projectedGross;
    return acc;
  }, {});

  const agingBuckets = vehicles.reduce((acc, v) => {
    if (v.daysInStock <= 30) acc['0-30'].push(v);
    else if (v.daysInStock <= 60) acc['31-60'].push(v);
    else if (v.daysInStock <= 90) acc['61-90'].push(v);
    else acc['90+'].push(v);
    return acc;
  }, { '0-30': [], '31-60': [], '61-90': [], '90+': [] });

  return (
    <div>
      <TopBar title="Reports" subtitle="Inventory analytics and aging breakdowns.">
        <SecondaryBtn icon={Download} onClick={() => exportInventoryPDF(vehicles, dealer.name)}>Export PDF</SecondaryBtn>
      </TopBar>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Aging breakdown</h3>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Days in inventory by bucket.</p>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(agingBuckets).map(([bucket, list]) => {
              const totalCost = list.reduce((s, v) => s + calcCosts(v).totalCost, 0);
              const pct = vehicles.length ? (list.length / vehicles.length) * 100 : 0;
              const color = bucket === '0-30' ? '#10b981' : bucket === '31-60' ? '#facc15' : bucket === '61-90' ? '#f97316' : '#f43f5e';
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium" style={{ color: theme.text }}>{bucket} days</span>
                    <span className="font-mono text-xs" style={{ color: theme.textMuted }}>{list.length} units · {fmt(totalCost)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.surfaceMuted }}>
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Performance by make</h3>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Projected gross by manufacturer.</p>
          </div>
          <table className="w-full">
            <tbody>
              {Object.entries(byMake).sort((a, b) => b[1].gross - a[1].gross).map(([make, data], i) => (
                <tr key={make} style={{ borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none' }}>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: theme.text }}>{make}</td>
                  <td className="px-3 py-3 text-xs font-mono" style={{ color: theme.textMuted }}>{data.count}u</td>
                  <td className="px-3 py-3 text-right text-sm font-mono" style={{ color: theme.textMuted }}>{fmt(data.cost)}</td>
                  <td className="px-5 py-3 text-right text-sm font-mono font-medium" style={{ color: '#047857' }}>{fmt(data.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Cost ledger — all units</h3>
          <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Total invested per vehicle.</p>
        </div>
        <table className="w-full text-sm">
          <thead style={{ background: theme.surfaceMuted + '80', borderBottom: `1px solid ${theme.border}` }}>
            <tr>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Vehicle</th>
              <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Cost categories</th>
              <th className="text-right px-3 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Asking</th>
              <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: theme.textMuted }}>Total cost</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, i) => {
              const c = calcCosts(v);
              return (
                <tr key={v.id} className="transition" style={{ borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>{v.year} {v.make} {v.model}</div>
                    <div className="text-[10px] font-mono" style={{ color: theme.textMuted }}>{v.id}</div>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: theme.textMuted }}>
                    {[...new Set((v.costs || []).map(c => c.label))].join(' · ')}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs" style={{ color: theme.textMuted }}>{fmt(v.askingPrice)}</td>
                  <td className="px-5 py-3 text-right font-mono text-sm font-semibold" style={{ color: theme.text }}>{fmt(c.totalCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── Settings ─────────────────────────────────────────────────
const SettingsPage = ({ dealer, setDealer, vehicles, setVehicles, onImportFrazer, setOnboarded }) => {
  const { theme, themeName, setThemeName } = useTheme();
  const [draftDealer, setDraftDealer] = useState(dealer);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync drafts if external state changes
  useEffect(() => { setDraftDealer(dealer); }, [dealer]);

  const isDirty = JSON.stringify(draftDealer) !== JSON.stringify(dealer);

  const handleSave = () => {
    setDealer(draftDealer);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setDealer(defaultDealer);
    setVehicles([]);
    setThemeName('light');
    setOnboarded(false);
    setShowResetConfirm(false);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Bright and clean' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
  ];

  return (
    <div>
      <TopBar title="Settings" subtitle="Customize your workspace and dealership info.">
        {savedFlash && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md" style={{ color: '#047857', background: theme.name === 'dark' ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }}>
            <CheckCircle2 size={14} /> Saved
          </div>
        )}
      </TopBar>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
                <Palette size={16} style={{ color: theme.textMuted }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Appearance</h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Choose how LotLedger looks on your screen.</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {themeOptions.map(opt => {
                  const Icon = opt.icon;
                  const isActive = themeName === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setThemeName(opt.value)}
                      className="rounded-lg p-4 text-left transition relative"
                      style={{
                        border: `2px solid ${isActive ? theme.accent : theme.border}`,
                        background: isActive ? (theme.name === 'dark' ? 'rgba(16,185,129,0.05)' : '#f0fdf4') : theme.surface,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{
                          background: opt.value === 'light' ? '#faf9f6' : '#0a0f0d',
                          border: '1px solid ' + theme.border
                        }}>
                          <Icon size={18} style={{ color: opt.value === 'light' ? '#f59e0b' : '#a8a29e' }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: theme.text }}>{opt.label}</div>
                          <div className="text-xs" style={{ color: theme.textMuted }}>{opt.desc}</div>
                        </div>
                      </div>
                      {isActive && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 size={16} style={{ color: theme.accent }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
                <Building2 size={16} style={{ color: theme.textMuted }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Dealership</h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>This info appears on exported reports.</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <ThemedInput label="Dealership name" value={draftDealer.name} onChange={v => setDraftDealer({ ...draftDealer, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <ThemedInput label="Phone" value={draftDealer.phone} onChange={v => setDraftDealer({ ...draftDealer, phone: v })} />
                <ThemedInput label="Email" value={draftDealer.email} onChange={v => setDraftDealer({ ...draftDealer, email: v })} />
              </div>
              <ThemedInput label="Address" value={draftDealer.address} onChange={v => setDraftDealer({ ...draftDealer, address: v })} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
                <User size={16} style={{ color: theme.textMuted }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Account</h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Your user profile.</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <ThemedInput label="Your name" value={draftDealer.userName} onChange={v => setDraftDealer({ ...draftDealer, userName: v })} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
                <Upload size={16} style={{ color: theme.textMuted }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Data import</h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Bring your inventory in from Frazer DMS.</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                <FileSpreadsheet size={18} className="flex-shrink-0 mt-0.5" style={{ color: theme.accent }} />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: theme.text }}>Import from Frazer DMS</div>
                  <div className="text-xs mt-1" style={{ color: theme.textMuted }}>
                    In Frazer, go to <span className="font-mono" style={{ color: theme.text }}>Miscellaneous → M-8 Export Data</span>, export as CSV with column headers, then upload here. LotLedger will auto-map common Frazer columns to your inventory fields.
                  </div>
                </div>
              </div>
              <button
                onClick={onImportFrazer}
                className="px-4 py-2 text-sm font-semibold rounded-md transition flex items-center gap-1.5"
                style={{ background: theme.primaryBg, color: theme.primaryText }}
                onMouseEnter={e => e.currentTarget.style.background = theme.primaryBgHover}
                onMouseLeave={e => e.currentTarget.style.background = theme.primaryBg}
              >
                <Upload size={14} /> Open import wizard
              </button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-lg font-medium">Danger zone</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Reset all data back to defaults.</p>
            </div>
            <div className="p-5">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 text-sm font-medium rounded-md transition"
                style={{ color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Reset all data
              </button>
            </div>
          </Card>

          <div className="flex justify-end items-center gap-3">
            {isDirty && (
              <span className="text-xs" style={{ color: theme.textMuted }}>You have unsaved changes</span>
            )}
            <PrimaryBtnLg icon={Save} onClick={handleSave}>Save changes</PrimaryBtnLg>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-base font-medium mb-3">Quick info</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Version</span>
                <span className="font-mono" style={{ color: theme.text }}>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Theme</span>
                <span className="font-medium capitalize" style={{ color: theme.text }}>{themeName}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Storage</span>
                <span className="font-mono" style={{ color: theme.text }}>Local</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Vehicles</span>
                <span className="font-mono" style={{ color: theme.text }}>{vehicles.length}</span>
              </div>
            </div>
          </Card>

          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0f1e18, #1a3a2e)', color: '#e7e5e4' }}>
            <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-base font-medium mb-2">Need help?</h3>
            <p className="text-xs text-stone-400 mb-3">Read the docs, or get support via email.</p>
            <a href="mailto:support@lotledger.example" className="text-xs text-emerald-400 hover:text-emerald-300 transition">support@lotledger.example →</a>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <Modal
          title="Reset all data?"
          subtitle="This will restore the seed inventory and default dealership info."
          onClose={() => setShowResetConfirm(false)}
          footer={
            <>
              <GhostBtn onClick={() => setShowResetConfirm(false)}>Cancel</GhostBtn>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white rounded-md transition flex items-center gap-1.5"
                style={{ background: '#dc2626' }}
                onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
              >
                <Trash2 size={14} /> Reset everything
              </button>
            </>
          }
        >
          <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
            <div className="text-xs" style={{ color: theme.name === 'dark' ? '#fca5a5' : '#7f1d1d' }}>
              <div className="font-semibold mb-1">This will permanently:</div>
              <ul className="space-y-1 list-disc pl-4">
                <li>Delete all vehicles you've added</li>
                <li>Restore the original seed inventory</li>
                <li>Reset dealership info to defaults</li>
                <li>Switch back to Light mode</li>
              </ul>
            </div>
          </div>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

const ThemedInput = ({ label, value, onChange, placeholder, mono, prefix, type = 'text' }) => {
  const { theme } = useTheme();
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: theme.textMuted }}>{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textSubtle }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} pr-3 py-2 text-sm rounded-md focus:outline-none transition ${mono ? 'font-mono' : ''}`}
          style={{ border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text }}
          onFocus={e => e.target.style.borderColor = theme.accent}
          onBlur={e => e.target.style.borderColor = theme.border}
        />
      </div>
    </div>
  );
};

// ─── Modal shell ──────────────────────────────────────────────
const Modal = ({ title, subtitle, onClose, footer, children }) => {
  const { theme } = useTheme();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fadeIn" style={{ background: 'rgba(10,15,13,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col"
        style={{ background: theme.surface, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex items-start justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <h2 style={{ fontFamily: 'Fraunces, serif', color: theme.text }} className="text-2xl font-light">{title}</h2>
            {subtitle && <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center transition" style={{ color: theme.textMuted }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}`, background: theme.surface, borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => {
  const { theme } = useTheme();
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: theme.textMuted }}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

// ─── Confirm Delete Modal ─────────────────────────────────────
const ConfirmDeleteModal = ({ vehicle, onClose, onConfirm }) => {
  const { theme } = useTheme();
  return (
    <Modal
      title="Delete vehicle?"
      subtitle="This action cannot be undone."
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white rounded-md transition flex items-center gap-1.5"
            style={{ background: '#dc2626' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
          >
            <Trash2 size={14} /> Delete vehicle
          </button>
        </>
      }
    >
      <div className="rounded-lg p-4 flex items-center gap-4" style={{ background: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.surface }}>
          <Car size={20} strokeWidth={1.5} style={{ color: theme.textMuted }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: theme.text }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: theme.textMuted }}>{vehicle.id} · {vehicle.vin}</div>
        </div>
      </div>
      <p className="text-sm" style={{ color: theme.textMuted }}>
        Removing this vehicle will permanently delete it from your inventory along with all logged costs.
      </p>
    </Modal>
  );
};

// ─── Frazer CSV import ────────────────────────────────────────
// Parses a CSV string into { headers, rows }. Handles quoted fields with commas
// and escaped quotes (Frazer uses standard RFC 4180 CSV format for M-8 export).
const parseCSV = (text) => {
  const out = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); out.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  // Filter empty rows
  const cleaned = out.filter(r => r.some(c => c && c.trim() !== ''));
  if (!cleaned.length) return { headers: [], rows: [] };
  // Auto-detect: also support tab-delimited if no commas found in first line
  if (cleaned[0].length === 1 && cleaned[0][0].includes('\t')) {
    return {
      headers: cleaned[0][0].split('\t'),
      rows: cleaned.slice(1).map(r => r[0].split('\t')),
    };
  }
  return { headers: cleaned[0], rows: cleaned.slice(1) };
};

// Map normalized header strings to LotLedger fields.
// Frazer's M-8 export uses 250+ optional columns; these are the common ones.
const FIELD_MAP = {
  stockNumber: ['stock', 'stocknumber', 'stockno', 'stock#', 'stocknum'],
  year: ['year', 'modelyear', 'vehicleyear'],
  make: ['make', 'vehiclemake'],
  model: ['model', 'vehiclemodel'],
  trim: ['trim', 'trimlevel', 'series'],
  vin: ['vin', 'vinnumber', 'vehicleidentificationnumber'],
  mileage: ['mileage', 'odometer', 'miles', 'odo'],
  color: ['color', 'exteriorcolor', 'extcolor'],
  purchasePrice: ['cost', 'purchaseprice', 'purchasecost', 'acquisitioncost', 'totalcost', 'vehiclecost', 'invoice', 'inventorycost'],
  askingPrice: ['price', 'askingprice', 'listprice', 'retailprice', 'saleprice', 'asking'],
  acquiredDate: ['dateacquired', 'purchasedate', 'datepurchased', 'acquired', 'dateinstock', 'datein'],
  status: ['status', 'inventorystatus', 'vehiclestatus', 'state'],
  reconCost: ['reconcost', 'recon', 'reconditioning', 'repaircost', 'totalrecon'],
};

const normalizeHeader = (h) => (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const autoMapColumns = (headers) => {
  const mapping = {};
  Object.keys(FIELD_MAP).forEach(field => { mapping[field] = -1; });
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    for (const [field, candidates] of Object.entries(FIELD_MAP)) {
      if (mapping[field] === -1 && candidates.some(c => norm === c || norm.includes(c))) {
        mapping[field] = idx;
        break;
      }
    }
  });
  return mapping;
};

const parseStatus = (raw) => {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return 'available';
  if (s.includes('sold')) return 'sold';
  if (s.includes('recon') || s.includes('repair') || s.includes('shop')) return 'reconditioning';
  return 'available';
};

const parseMoney = (raw) => {
  if (raw == null) return 0;
  const n = parseFloat(String(raw).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

const parseInt0 = (raw) => {
  const n = parseInt(String(raw || '').replace(/[,\s]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

const daysBetween = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

// Convert a CSV row + mapping into a LotLedger vehicle object
const rowToVehicle = (row, mapping, existingIds) => {
  const get = (field) => mapping[field] >= 0 ? (row[mapping[field]] || '').trim() : '';

  const make = get('make');
  const model = get('model');
  if (!make && !model) return null; // skip blank rows

  const stock = get('stockNumber') || `V-${1100 + existingIds.size}`;
  const purchase = parseMoney(get('purchasePrice'));
  const recon = parseMoney(get('reconCost'));
  const dateStr = get('acquiredDate');
  const acquiredDate = dateStr && !isNaN(new Date(dateStr).getTime())
    ? new Date(dateStr).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const costs = [mkCost('Purchase', purchase, 'purchase')];
  if (recon > 0) costs.push(mkCost('Added costs', recon, 'custom', 'Imported recon total'));

  return {
    id: stock,
    year: parseInt0(get('year')) || new Date().getFullYear(),
    make: make || 'Unknown',
    model: model || 'Unknown',
    trim: get('trim'),
    vin: get('vin') || 'PENDING',
    mileage: parseInt0(get('mileage')),
    color: get('color') || 'TBD',
    acquiredDate,
    daysInStock: daysBetween(dateStr),
    askingPrice: parseMoney(get('askingPrice')),
    status: parseStatus(get('status')),
    costs,
  };
};

const FIELD_LABELS = {
  stockNumber: 'Stock #',
  year: 'Year',
  make: 'Make',
  model: 'Model',
  trim: 'Trim',
  vin: 'VIN',
  mileage: 'Mileage',
  color: 'Color',
  purchasePrice: 'Purchase price',
  askingPrice: 'Asking price',
  acquiredDate: 'Acquired date',
  status: 'Status',
  reconCost: 'Recon cost (optional)',
};

const REQUIRED_FIELDS = ['make', 'model', 'purchasePrice'];

const ImportFrazerModal = ({ onClose, onImport, existingVehicles }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState('upload'); // upload | map | preview
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('append'); // append | replace
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      const result = parseCSV(text);
      if (!result.headers.length || !result.rows.length) {
        setError('No data found in this file.');
        return;
      }
      setFileName(file.name);
      setParsed(result);
      setMapping(autoMapColumns(result.headers));
      setStep('map');
    } catch (e) {
      setError('Could not read file: ' + e.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const missingRequired = REQUIRED_FIELDS.filter(f => mapping[f] == null || mapping[f] < 0);

  const preview = useMemo(() => {
    if (!parsed || step !== 'preview') return [];
    const existingIds = new Set(existingVehicles.map(v => v.id));
    return parsed.rows
      .slice(0, 100)
      .map(r => rowToVehicle(r, mapping, existingIds))
      .filter(Boolean);
  }, [parsed, mapping, step, existingVehicles]);

  const fullParsed = useMemo(() => {
    if (!parsed || step !== 'preview') return [];
    const existingIds = new Set(existingVehicles.map(v => v.id));
    const seen = new Set();
    const result = [];
    for (const row of parsed.rows) {
      const v = rowToVehicle(row, mapping, seen);
      if (!v) continue;
      // Dedupe by stock id within this import
      let finalId = v.id;
      let n = 1;
      while (seen.has(finalId) || (mode === 'append' && existingIds.has(finalId))) {
        finalId = `${v.id}-${n}`;
        n++;
      }
      v.id = finalId;
      seen.add(finalId);
      result.push(v);
    }
    return result;
  }, [parsed, mapping, step, existingVehicles, mode]);

  const handleImport = () => {
    onImport(fullParsed, mode);
  };

  return (
    <Modal
      title={step === 'upload' ? 'Import from Frazer' : step === 'map' ? 'Map columns' : 'Preview import'}
      subtitle={
        step === 'upload'
          ? 'Export a CSV from Frazer (Miscellaneous → M-8 Export Data) and upload it here.'
          : step === 'map'
          ? `Match Frazer columns to LotLedger fields. ${parsed?.rows.length || 0} rows detected.`
          : `Ready to import ${fullParsed.length} vehicles from ${fileName}.`
      }
      onClose={onClose}
      footer={
        step === 'upload' ? (
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        ) : step === 'map' ? (
          <>
            <GhostBtn onClick={() => { setStep('upload'); setParsed(null); }}>Back</GhostBtn>
            <PrimaryBtn
              icon={ChevronRight}
              onClick={() => {
                if (missingRequired.length) {
                  setError(`Please map required fields: ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`);
                  return;
                }
                setError('');
                setStep('preview');
              }}
            >
              Preview ({parsed?.rows.length} rows)
            </PrimaryBtn>
          </>
        ) : (
          <>
            <GhostBtn onClick={() => setStep('map')}>Back</GhostBtn>
            <PrimaryBtn icon={Upload} onClick={handleImport}>
              {mode === 'replace' ? 'Replace inventory' : `Import ${fullParsed.length} vehicles`}
            </PrimaryBtn>
          </>
        )
      }
    >
      {step === 'upload' && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl p-10 text-center transition cursor-pointer"
            style={{
              border: `2px dashed ${dragging ? theme.accent : theme.border}`,
              background: dragging ? (theme.name === 'dark' ? 'rgba(16,185,129,0.05)' : '#f0fdf4') : theme.surfaceMuted + '50',
            }}
            onClick={() => document.getElementById('frazer-csv-input')?.click()}
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
              <FileSpreadsheet size={22} style={{ color: theme.accent }} />
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>
              Drop your Frazer CSV here
            </div>
            <div className="text-xs" style={{ color: theme.textMuted }}>
              or click to browse · accepts .csv and .txt files
            </div>
            <input
              id="frazer-csv-input"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          <div className="rounded-lg p-4" style={{ background: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
            <div className="text-xs font-semibold mb-2" style={{ color: theme.text }}>How to export from Frazer</div>
            <ol className="text-xs space-y-1 pl-4 list-decimal" style={{ color: theme.textMuted }}>
              <li>Open Frazer on your dealership computer</li>
              <li>Go to <span className="font-mono" style={{ color: theme.text }}>Miscellaneous → M-8 Export Data</span></li>
              <li>Choose <span className="font-mono" style={{ color: theme.text }}>.csv</span> format and check <span className="font-mono" style={{ color: theme.text }}>Include Column Headers</span></li>
              <li>Select the data fields you want (at minimum: Make, Model, Cost)</li>
              <li>Click <span className="font-mono" style={{ color: theme.text }}>Create File</span> and drop it above</li>
            </ol>
          </div>

          <div className="text-xs" style={{ color: theme.textSubtle }}>
            <AlertCircle size={12} className="inline mr-1" />
            Frazer is on-premise software with no live connection. This is the official way to move data out.
          </div>
        </>
      )}

      {step === 'map' && parsed && (
        <>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            <div className="px-4 py-2.5 flex items-center gap-2 text-xs" style={{ background: theme.surfaceMuted, color: theme.textMuted }}>
              <FileSpreadsheet size={12} />
              <span className="font-mono">{fileName}</span>
              <span className="ml-auto">{parsed.headers.length} columns · {parsed.rows.length} rows</span>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {Object.keys(FIELD_LABELS).map(field => {
                const isRequired = REQUIRED_FIELDS.includes(field);
                const isMapped = mapping[field] >= 0;
                return (
                  <div key={field} className="grid grid-cols-2 gap-3 items-center">
                    <div className="text-xs flex items-center gap-2">
                      <span style={{ color: theme.text }}>{FIELD_LABELS[field]}</span>
                      {isRequired && <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#dc2626' }}>Required</span>}
                      {isMapped && !isRequired && <CheckCircle2 size={11} style={{ color: theme.accent }} />}
                    </div>
                    <select
                      value={mapping[field] ?? -1}
                      onChange={e => setMapping({ ...mapping, [field]: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none transition"
                      style={{ border: `1px solid ${isRequired && !isMapped ? '#dc2626' : theme.border}`, background: theme.surface, color: theme.text }}
                    >
                      <option value={-1}>— Not mapped —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-md px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </>
      )}

      {step === 'preview' && (
        <>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: theme.textMuted }}>Import mode</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'append', label: 'Add to existing', desc: 'Keep current vehicles, add these on top' },
                { value: 'replace', label: 'Replace inventory', desc: 'Delete current vehicles, use only these' },
              ].map(opt => {
                const isActive = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className="rounded-lg p-3 text-left transition"
                    style={{
                      border: `2px solid ${isActive ? theme.accent : theme.border}`,
                      background: isActive ? (theme.name === 'dark' ? 'rgba(16,185,129,0.05)' : '#f0fdf4') : theme.surface,
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: theme.text }}>{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            <div className="px-4 py-2.5 text-xs" style={{ background: theme.surfaceMuted, color: theme.textMuted }}>
              First {Math.min(preview.length, 10)} of {fullParsed.length} vehicles
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: theme.surfaceMuted + '80' }}>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: theme.textMuted }}>Stock</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: theme.textMuted }}>Vehicle</th>
                    <th className="text-right px-3 py-2 font-semibold" style={{ color: theme.textMuted }}>Cost</th>
                    <th className="text-right px-3 py-2 font-semibold" style={{ color: theme.textMuted }}>Asking</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: theme.textMuted }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((v, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${theme.borderSubtle}` }}>
                      <td className="px-3 py-2 font-mono" style={{ color: theme.textMuted }}>{v.id}</td>
                      <td className="px-3 py-2" style={{ color: theme.text }}>{v.year} {v.make} {v.model}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: theme.text }}>{fmt((v.costs[0]?.amount || 0) + (v.costs[1]?.amount || 0))}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: theme.text }}>{fmt(v.askingPrice)}</td>
                      <td className="px-3 py-2"><StatusChip status={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {mode === 'replace' && (
            <div className="rounded-md px-3 py-2 text-xs flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">This will delete {existingVehicles.length} existing vehicles.</div>
                <div className="opacity-80 mt-0.5">Only the {fullParsed.length} imported vehicles will remain.</div>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'upload' && error && (
        <div className="rounded-md px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </Modal>
  );
};


// ─── Add Vehicle Modal ────────────────────────────────────────
const AddVehicleModal = ({ onClose, onSave }) => {
  const { theme } = useTheme();
  const [form, setForm] = useState({
    year: '', make: '', model: '', vin: '', mileage: '',
    color: '', purchase: '', askingPrice: ''
  });
  const [error, setError] = useState('');
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.make.trim() || !form.model.trim()) { setError('Make and Model are required.'); return; }
    if (!form.purchase || isNaN(parseFloat(form.purchase))) { setError('Purchase price is required.'); return; }
    const newVehicle = {
      id: `V-${1049 + Math.floor(Math.random() * 9000)}`,
      year: parseInt(form.year) || new Date().getFullYear(),
      make: form.make.trim(),
      model: form.model.trim(),
      trim: '',
      vin: form.vin.trim() || 'PENDING',
      mileage: parseInt(form.mileage) || 0,
      color: form.color.trim() || 'TBD',
      acquiredDate: new Date().toISOString().slice(0, 10),
      daysInStock: 0,
      askingPrice: parseFloat(form.askingPrice) || 0,
      status: 'reconditioning',
      costs: [mkCost('Purchase', parseFloat(form.purchase) || 0, 'purchase')],
    };
    onSave(newVehicle);
  };

  return (
    <Modal
      title="Add vehicle"
      subtitle="Enter the basics and purchase price. Add other cost categories later from the vehicle detail page."
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn icon={Tag} onClick={handleSave}>Add to inventory</PrimaryBtn>
        </>
      }
    >
      <Section title="Vehicle">
        <div className="grid grid-cols-3 gap-3">
          <ThemedInput label="Year" value={form.year} onChange={v => update('year', v)} placeholder="2024" mono />
          <ThemedInput label="Make *" value={form.make} onChange={v => update('make', v)} placeholder="Toyota" />
          <ThemedInput label="Model *" value={form.model} onChange={v => update('model', v)} placeholder="Camry" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ThemedInput label="Color" value={form.color} onChange={v => update('color', v)} placeholder="Silver" />
          <ThemedInput label="Mileage" value={form.mileage} onChange={v => update('mileage', v)} placeholder="35000" mono />
          <ThemedInput label="VIN" value={form.vin} onChange={v => update('vin', v)} placeholder="17-char VIN" mono />
        </div>
      </Section>

      <Section title="Purchase">
        <div className="grid grid-cols-2 gap-3">
          <ThemedInput label="Purchase price *" value={form.purchase} onChange={v => update('purchase', v)} placeholder="18500" prefix="$" mono />
          <ThemedInput label="Asking price" value={form.askingPrice} onChange={v => update('askingPrice', v)} placeholder="24995" prefix="$" mono />
        </div>
        <p className="text-xs -mt-1" style={{ color: theme.textMuted }}>
          Add Added costs, Labor, Transport, or any other cost category later from the vehicle's detail page.
        </p>
      </Section>

      {error && (
        <div className="rounded-md px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </Modal>
  );
};

// ─── Edit Vehicle Modal ───────────────────────────────────────
const EditVehicleModal = ({ vehicle, onClose, onSave }) => {
  const { theme } = useTheme();
  const [form, setForm] = useState({
    year: String(vehicle.year || ''),
    make: vehicle.make || '',
    model: vehicle.model || '',
    trim: vehicle.trim || '',
    vin: vehicle.vin || '',
    mileage: String(vehicle.mileage || ''),
    color: vehicle.color || '',
    askingPrice: String(vehicle.askingPrice || ''),
    status: vehicle.status || 'available',
    daysInStock: String(vehicle.daysInStock || 0),
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    onSave({
      ...vehicle,
      year: parseInt(form.year) || vehicle.year,
      make: form.make.trim() || vehicle.make,
      model: form.model.trim() || vehicle.model,
      trim: form.trim.trim(),
      vin: form.vin.trim() || vehicle.vin,
      mileage: parseInt(form.mileage) || 0,
      color: form.color.trim() || vehicle.color,
      askingPrice: parseFloat(form.askingPrice) || 0,
      status: form.status,
      daysInStock: parseInt(form.daysInStock) || 0,
    });
  };

  return (
    <Modal
      title="Edit vehicle"
      subtitle={`Updating ${vehicle.id} · ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn icon={CheckCircle2} onClick={handleSave}>Save changes</PrimaryBtn>
        </>
      }
    >
      <Section title="Vehicle">
        <div className="grid grid-cols-3 gap-3">
          <ThemedInput label="Year" value={form.year} onChange={v => update('year', v)} mono />
          <ThemedInput label="Make" value={form.make} onChange={v => update('make', v)} />
          <ThemedInput label="Model" value={form.model} onChange={v => update('model', v)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ThemedInput label="Trim" value={form.trim} onChange={v => update('trim', v)} />
          <ThemedInput label="Color" value={form.color} onChange={v => update('color', v)} />
          <ThemedInput label="Mileage" value={form.mileage} onChange={v => update('mileage', v)} mono />
        </div>
        <ThemedInput label="VIN" value={form.vin} onChange={v => update('vin', v)} mono />
      </Section>

      <Section title="Lot status">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: theme.textMuted }}>Status</label>
            <select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md focus:outline-none transition"
              style={{ border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text }}
            >
              <option value="available">Available</option>
              <option value="reconditioning">In Recon</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <ThemedInput label="Days in stock" value={form.daysInStock} onChange={v => update('daysInStock', v)} mono />
        </div>
      </Section>

      <Section title="Pricing">
        <ThemedInput label="Asking price" value={form.askingPrice} onChange={v => update('askingPrice', v)} prefix="$" mono />
        <p className="text-xs -mt-1" style={{ color: theme.textMuted }}>
          To edit cost categories, open the vehicle's detail page.
        </p>
      </Section>
    </Modal>
  );
};

// ─── Add Cost Modal (supports pre-filled category, optional name) ─
const AddCostModal = ({ vehicle, presetLabel, onClose, onSave }) => {
  const { theme } = useTheme();
  const [label, setLabel] = useState(presetLabel || '');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const presets = ['Added costs', 'Labor', 'Transport', 'Detail', 'Tires', 'Inspection'];

  const handleSave = () => {
    if (!label.trim()) { setError('Category name is required.'); return; }
    const n = parseFloat(amount);
    if (isNaN(n)) { setError('Amount must be a number.'); return; }
    onSave(vehicle.id, mkCost(label.trim(), n, 'custom', name.trim()));
  };

  const titleText = presetLabel ? `Add to "${presetLabel}"` : 'Add cost';
  const subtitleText = presetLabel
    ? `Logging another entry under ${presetLabel} for ${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : `New cost category for ${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  // Smart placeholder examples based on the category
  const namePlaceholder = (() => {
    const l = (label || '').toLowerCase();
    if (l.includes('added') || l.includes('part')) return 'e.g. Front bumper, brake pads';
    if (l.includes('labor')) return 'e.g. Front-end alignment';
    if (l.includes('tire')) return 'e.g. Set of 4 Michelins';
    if (l.includes('detail')) return 'e.g. Full interior shampoo';
    if (l.includes('transport')) return 'e.g. Auction pickup, Phoenix → Fresno';
    if (l.includes('inspect')) return 'e.g. Smog cert';
    return 'e.g. Front bumper replacement';
  })();

  return (
    <Modal
      title={titleText}
      subtitle={subtitleText}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn icon={Plus} onClick={handleSave}>Add cost</PrimaryBtn>
        </>
      }
    >
      <Section title="Category">
        <ThemedInput label="Category name" value={label} onChange={setLabel} placeholder="e.g. Added costs, Labor, Detail…" />
        {!presetLabel && (
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p}
                onClick={() => setLabel(p)}
                className="px-3 py-1 text-xs rounded-full transition"
                style={{ border: `1px solid ${theme.border}`, color: theme.textMuted, background: theme.surface }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.background = theme.surfaceMuted; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.surface; }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Entry">
        <ThemedInput label="Title (optional)" value={name} onChange={setName} placeholder={namePlaceholder} />
        <ThemedInput label="Amount" value={amount} onChange={setAmount} placeholder="0.00" prefix="$" mono />
      </Section>

      {error && (
        <div className="rounded-md px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </Modal>
  );
};


// ─── Onboarding ───────────────────────────────────────────────
const OB_STEPS = [
  { id: 'welcome' },
  {
    id: 'you',
    heading: 'First, about you.',
    subheading: "This shows in the sidebar and on reports.",
    fields: [
      { key: 'userName', label: 'Your name', placeholder: 'Marcus Reyes', type: 'text', required: true },
    ],
  },
  {
    id: 'dealership',
    heading: 'Your dealership.',
    subheading: "We'll put this on every export and PDF.",
    fields: [
      { key: 'name',    label: 'Dealership name', placeholder: 'Reyes Auto Group',         type: 'text',  required: true },
      { key: 'phone',   label: 'Phone',            placeholder: '(559) 555-0100',            type: 'tel',   required: false },
      { key: 'email',   label: 'Email',            placeholder: 'sales@yourdealer.com',      type: 'email', required: false },
      { key: 'address', label: 'Address',          placeholder: '1240 Blackstone Ave, Fresno, CA', type: 'text', required: false },
    ],
  },
  { id: 'done' },
];

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ userName: '', name: '', phone: '', email: '', address: '' });
  const [visible, setVisible] = useState(true);
  const [dir, setDir] = useState(1);

  const current = OB_STEPS[step];
  const dotCount = OB_STEPS.length - 2;
  const dotIndex = Math.max(0, Math.min(step - 1, dotCount - 1));

  const canAdvance = () => {
    if (current.id === 'welcome' || current.id === 'done') return true;
    if (current.id === 'you') return form.userName.trim().length > 0;
    if (current.id === 'dealership') return form.name.trim().length > 0;
    return true;
  };

  const transition = (delta, cb) => {
    setDir(delta);
    setVisible(false);
    setTimeout(() => { setVisible(true); cb(); }, 220);
  };

  const goNext = () => {
    if (!canAdvance()) return;
    if (current.id === 'done') { onComplete(form); return; }
    transition(1, () => setStep(s => s + 1));
  };
  const goBack = () => {
    if (step === 0) return;
    transition(-1, () => setStep(s => s - 1));
  };

  const panelStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${dir > 0 ? '-10px' : '10px'})`,
    transition: 'opacity 0.22s ease, transform 0.22s ease',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f0d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif", padding: '24px',
    }}>
      <style>{`
        @keyframes ob-up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .ob-in  { animation: ob-up 0.45s ease both; }
        .ob-in1 { animation: ob-up 0.45s 0.07s ease both; }
        .ob-in2 { animation: ob-up 0.45s 0.14s ease both; }
        .ob-in3 { animation: ob-up 0.45s 0.21s ease both; }
        .ob-in4 { animation: ob-up 0.45s 0.28s ease both; }
        .ob-field:focus { outline:none; border-color:#10b981!important; box-shadow:0 0 0 3px rgba(16,185,129,0.15); }
        .ob-primary { transition: background 0.15s !important; }
        .ob-primary:hover:not(:disabled) { background:#34d399!important; }
        .ob-primary:disabled { opacity:0.38; cursor:not-allowed; }
        .ob-ghost:hover { color:#a8a29e!important; border-color:#3d4d46!important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div className="ob-in" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:52 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'linear-gradient(135deg,#34d399,#047857)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 10px 30px rgba(6,78,59,0.5)',
          }}>
            <span style={{ fontFamily:'Fraunces,serif', color:'#0f1e18', fontSize:22, fontWeight:900, fontStyle:'italic', lineHeight:1 }}>L</span>
          </div>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', color:'#e7e5e4', fontSize:20, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1 }}>LotLedger</div>
            <div style={{ color:'#374151', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>Dealer OS</div>
          </div>
        </div>

        {/* Animated panel */}
        <div style={panelStyle}>

          {current.id === 'welcome' && (
            <div>
              <div style={{ color:'#e7e5e4', fontSize:38, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1.15, marginBottom:16 }}>
                Welcome to<br />
                <span style={{ fontFamily:'Fraunces,serif', fontStyle:'italic', color:'#10b981' }}>your lot.</span>
              </div>
              <div style={{ color:'#6b7280', fontSize:15, lineHeight:1.65, marginBottom:44 }}>
                Track every vehicle, every cost, and every dollar of projected gross — from acquisition to sale.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:48 }}>
                {[['📋','Inventory cost tracking'],['📊','Gross margin reports'],['📄','One-click PDF exports']].map(([icon,label])=>(
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:12, color:'#9ca3af', fontSize:14 }}>
                    <span style={{ fontSize:18, width:24, textAlign:'center' }}>{icon}</span>{label}
                  </div>
                ))}
              </div>
              <button className="ob-primary" onClick={goNext} style={{
                width:'100%', padding:'14px 0', borderRadius:10, border:'none', cursor:'pointer',
                background:'#10b981', color:'#0a0f0d', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
              }}>Get started →</button>
            </div>
          )}

          {(current.id === 'you' || current.id === 'dealership') && (
            <div>
              <div style={{ color:'#6b7280', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
                Step {step} of {dotCount}
              </div>
              <div style={{ color:'#e7e5e4', fontSize:30, fontWeight:700, letterSpacing:'-0.025em', lineHeight:1.2, marginBottom:8 }}>
                {current.heading}
              </div>
              <div style={{ color:'#6b7280', fontSize:14, marginBottom:36 }}>{current.subheading}</div>

              <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                {current.fields.map((f, i) => (
                  <div key={f.key} className={`ob-in${i+1}`}>
                    <label style={{ display:'block', color:'#6b7280', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>
                      {f.label}{f.required ? <span style={{color:'#10b981'}}> *</span> : ''}
                    </label>
                    <input
                      type={f.type}
                      className="ob-field"
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && goNext()}
                      placeholder={f.placeholder}
                      autoFocus={i === 0}
                      style={{
                        width:'100%', boxSizing:'border-box',
                        background:'#141a17', border:'1.5px solid #2a332e',
                        borderRadius:8, color:'#e7e5e4', fontSize:15,
                        padding:'11px 14px', transition:'border-color 0.15s, box-shadow 0.15s',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Progress dots */}
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:36 }}>
                {Array.from({length:dotCount}).map((_,i) => (
                  <div key={i} style={{
                    height:5, borderRadius:3,
                    width: i===dotIndex ? 22 : 6,
                    background: i===dotIndex ? '#10b981' : '#1c2420',
                    transition:'width 0.25s, background 0.25s',
                  }}/>
                ))}
              </div>

              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                {step > 1 && (
                  <button className="ob-ghost" onClick={goBack} style={{
                    flex:'0 0 auto', padding:'13px 20px', borderRadius:10,
                    border:'1.5px solid #2a332e', background:'transparent',
                    color:'#6b7280', fontSize:14, cursor:'pointer', transition:'color 0.15s, border-color 0.15s',
                  }}>← Back</button>
                )}
                <button className="ob-primary" onClick={goNext} disabled={!canAdvance()} style={{
                  flex:1, padding:'13px 0', borderRadius:10, border:'none',
                  background:'#10b981', color:'#0a0f0d', fontWeight:700, fontSize:15,
                }}>Continue →</button>
              </div>
            </div>
          )}

          {current.id === 'done' && (
            <div style={{ textAlign:'center' }}>
              <div style={{
                width:72, height:72, borderRadius:'50%', margin:'0 auto 28px',
                background:'rgba(16,185,129,0.1)', border:'1.5px solid rgba(16,185,129,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#10b981', fontSize:30,
              }}>✓</div>
              <div style={{ color:'#e7e5e4', fontSize:28, fontWeight:700, letterSpacing:'-0.025em', marginBottom:12 }}>
                You're all set{form.userName ? `, ${form.userName.split(' ')[0]}` : ''}.
              </div>
              <div style={{ color:'#6b7280', fontSize:15, lineHeight:1.65, marginBottom:48 }}>
                {form.name
                  ? <><span style={{color:'#10b981'}}>{form.name}</span> is ready. Add your first vehicle to get started.</>
                  : <>Your lot is ready. Add your first vehicle to get started.</>}
              </div>
              <button className="ob-primary" onClick={goNext} style={{
                width:'100%', padding:'14px 0', borderRadius:10, border:'none', cursor:'pointer',
                background:'#10b981', color:'#0a0f0d', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
              }}>Open LotLedger →</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────
export default function App() {
  // Load persisted state on first render
  const persisted = loadState();
  const [view, setView] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [addingCost, setAddingCost] = useState(null); // { vehicleId, presetLabel? }
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [vehicles, setVehicles] = useState(persisted?.vehicles || []);
  const [themeName, setThemeName] = useState(persisted?.themeName || 'light');
  const [dealer, setDealer] = useState(persisted?.dealer || defaultDealer);
  const [onboarded, setOnboarded] = useState(persisted?.onboarded || false);
  const [importFlash, setImportFlash] = useState(null);
  const [vehicleToast, setVehicleToast] = useState(null);

  // Persist any state change (vehicles, dealer, theme)
  useEffect(() => {
    saveState({ dealer, themeName, vehicles, onboarded });
  }, [vehicles, dealer, themeName, onboarded]);

  const theme = THEMES[themeName];

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const editingVehicle = vehicles.find(v => v.id === editingVehicleId);
  const deletingVehicle = vehicles.find(v => v.id === deletingVehicleId);
  const addingCostVehicle = addingCost ? vehicles.find(v => v.id === addingCost.vehicleId) : null;

  const handleSelectVehicle = (id) => {
    setSelectedVehicleId(id);
    setView('detail');
  };

  const handleAddVehicle = (newV) => {
    setVehicles(prev => [newV, ...prev]);
    setShowAddModal(false);
    setVehicleToast(`${newV.year} ${newV.make} ${newV.model}`);
    setTimeout(() => setVehicleToast(null), 3500);
  };

  const handleSaveEdit = (updated) => {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
    setEditingVehicleId(null);
  };

  const handleConfirmDelete = () => {
    const id = deletingVehicleId;
    setVehicles(prev => prev.filter(v => v.id !== id));
    if (selectedVehicleId === id) {
      setSelectedVehicleId(null);
      setView('inventory');
    }
    setDeletingVehicleId(null);
  };

  const handleAddCost = (vehicleId, cost) => {
    setVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, costs: [...(v.costs || []), cost] } : v
    ));
    setAddingCost(null);
  };

  const handleDeleteCost = (vehicleId, costId) => {
    setVehicles(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, costs: (v.costs || []).filter(c => c.id !== costId) } : v
    ));
  };

  const handleImportFrazer = (importedVehicles, mode) => {
    if (mode === 'replace') {
      setVehicles(importedVehicles);
    } else {
      setVehicles(prev => [...importedVehicles, ...prev]);
    }
    setShowImportModal(false);
    setImportFlash({ count: importedVehicles.length, mode });
    setTimeout(() => setImportFlash(null), 4000);
    setView('inventory');
  };

  const handleOnboardingComplete = (form) => {
    setDealer({
      userName: form.userName,
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
    });
    setOnboarded(true);
  };

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      <div className="min-h-screen flex transition-colors" style={{ background: theme.bg, fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif", color: theme.text }}>
        <style>{`
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
          input::placeholder { color: ${theme.textSubtle}; }
        `}</style>

        <Sidebar
          active={view === 'detail' ? 'inventory' : view}
          setActive={(v) => { setView(v); setSelectedVehicleId(null); }}
          onAddVehicle={() => setShowAddModal(true)}
          dealer={dealer}
        />

        <main className="flex-1 px-10 py-8 max-w-[1400px]">
          {view === 'dashboard' && <Dashboard vehicles={vehicles} onSelectVehicle={handleSelectVehicle} dealer={dealer} />}
          {view === 'inventory' && (
            <Inventory
              vehicles={vehicles}
              dealer={dealer}
              onSelectVehicle={handleSelectVehicle}
              onAddVehicle={() => setShowAddModal(true)}
              onEditVehicle={(id) => setEditingVehicleId(id)}
              onRequestDelete={(id) => setDeletingVehicleId(id)}
              onImportFrazer={() => setShowImportModal(true)}
            />
          )}
          {view === 'reports' && <Reports vehicles={vehicles} dealer={dealer} />}
          {view === 'settings' && <SettingsPage dealer={dealer} setDealer={setDealer} vehicles={vehicles} setVehicles={setVehicles} onImportFrazer={() => setShowImportModal(true)} setOnboarded={setOnboarded} />}
          {view === 'detail' && selectedVehicle && (
            <VehicleDetail
              vehicle={selectedVehicle}
              onBack={() => { setView('inventory'); setSelectedVehicleId(null); }}
              onAddCost={() => setAddingCost({ vehicleId: selectedVehicle.id })}
              onAddCostToCategory={(vehicleId, label) => setAddingCost({ vehicleId, presetLabel: label })}
              onDeleteCost={handleDeleteCost}
              onEditVehicle={(id) => setEditingVehicleId(id)}
            />
          )}
        </main>

        {/* Import success flash */}
        {importFlash && (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg shadow-2xl px-5 py-4 flex items-center gap-3 animate-fadeIn" style={{ background: theme.surface, border: `1px solid ${theme.border}`, minWidth: 320 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.name === 'dark' ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }}>
              <CheckCircle2 size={20} style={{ color: theme.accent }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: theme.text }}>Import successful</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                {importFlash.count} vehicle{importFlash.count !== 1 ? 's' : ''} {importFlash.mode === 'replace' ? 'now in inventory' : 'added'}
              </div>
            </div>
            <button onClick={() => setImportFlash(null)} className="p-1 rounded transition" style={{ color: theme.textSubtle }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Vehicle added toast */}
        {vehicleToast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg shadow-2xl px-5 py-4 flex items-center gap-3 animate-fadeIn" style={{ background: theme.surface, border: `1px solid ${theme.border}`, minWidth: 300 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.name === 'dark' ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }}>
              <CheckCircle2 size={20} style={{ color: theme.accent }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: theme.text }}>Vehicle added</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{vehicleToast}</div>
            </div>
            <button onClick={() => setVehicleToast(null)} className="p-1 rounded transition" style={{ color: theme.textSubtle }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceMuted}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} onSave={handleAddVehicle} />}
        {showImportModal && <ImportFrazerModal onClose={() => setShowImportModal(false)} onImport={handleImportFrazer} existingVehicles={vehicles} />}
        {editingVehicle && <EditVehicleModal vehicle={editingVehicle} onClose={() => setEditingVehicleId(null)} onSave={handleSaveEdit} />}
        {addingCostVehicle && <AddCostModal vehicle={addingCostVehicle} presetLabel={addingCost.presetLabel} onClose={() => setAddingCost(null)} onSave={handleAddCost} />}
        {deletingVehicle && <ConfirmDeleteModal vehicle={deletingVehicle} onClose={() => setDeletingVehicleId(null)} onConfirm={handleConfirmDelete} />}
      </div>
    </ThemeContext.Provider>
  );
}
