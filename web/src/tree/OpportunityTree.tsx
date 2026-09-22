/**
 * Vista Árbol de oportunidades (D3), fiel al prototipo
 * (reference/prototipo-pando.html): raíz → troncos → ramas → hojas, plegado por
 * defecto, color por etapa o urgencia, tamaño de hoja por monto, anillos de
 * deadline (rojo vencido, ámbar en 7 días) y subtotales por nodo.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { STAGES, type StageKey } from '@pando/shared';
import {
  activeAmount,
  buildForest,
  daysTo,
  money,
  urgency,
  type ForestNode,
  type ItemWithId,
} from './model';

export type ColorBy = 'stage' | 'urg';

interface Props {
  items: ItemWithId[];
  colorBy: ColorBy;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  /** Muestra montos (tamaño de hoja por monto) según el permiso del rol. */
  showMoney: boolean;
  /** Id a resaltar tras una búsqueda. */
  highlightId?: string | null;
}

const ROW_H = 30;
const COLS = [0, 190, 420, 640];
const WIDTHS = [0, 13, 7, 2.2];
const W = 1020;

export function OpportunityTree({
  items,
  colorBy,
  collapsed,
  onToggle,
  onSelect,
  selectedId,
  showMoney,
  highlightId,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.innerHTML = '';
    if (items.length === 0) return;

    const stageLabel = (s: StageKey) => t(`stage.${s}`);
    const stageColor = (s: StageKey) => STAGES[s].colorLight;
    const fmtD = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      if (!y) return t('tree.noDate');
      return new Date(y, m - 1, d).toLocaleDateString(i18n.resolvedLanguage ?? 'es', {
        day: 'numeric',
        month: 'short',
      });
    };

    const rootData = buildForest(items, collapsed);
    const h = d3.hierarchy<ForestNode>(rootData, (d) => d.children);
    d3
      .tree<ForestNode>()
      .nodeSize([ROW_H, 1])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.35))(h);

    let minX = Infinity;
    let maxX = -Infinity;
    h.each((n) => {
      n.y = COLS[n.depth];
      const x = n.x ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
    const H = maxX - minX + ROW_H * 2;
    const off = -minX + ROW_H;

    const svg = d3
      .select(box)
      .append('svg')
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', t('tree.aria'));
    const g = svg.append('g').attr('transform', `translate(60,${off})`);

    const rScale = d3.scaleSqrt().domain([0, 5e6]).range([5, 15]).clamp(true);

    // Enlaces (corteza)
    g.selectAll('path.link')
      .data(h.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.target.depth < 3 ? 'var(--bark)' : 'var(--bark2)'))
      .attr('stroke-width', (d) => WIDTHS[d.target.depth])
      .attr('stroke-opacity', (d) => (d.target.depth < 3 ? 0.9 : 0.7))
      .attr('d', (d) => {
        // Curva horizontal (equivale a d3.linkHorizontal con x=node.y, y=node.x).
        const sy = d.source.y ?? 0;
        const sx = d.source.x ?? 0;
        const ty = d.target.y ?? 0;
        const tx = d.target.x ?? 0;
        const mx = (sy + ty) / 2;
        return `M${sy},${sx}C${mx},${sx} ${mx},${tx} ${ty},${tx}`;
      });

    const node = g
      .selectAll('g.node')
      .data(h.descendants())
      .join('g')
      .attr('class', (d) => 'node ' + (d.data.kind === 'leaf' ? 'leaf' : 'group'))
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    // Raíz
    const root = node.filter((d) => d.data.kind === 'root');
    root.append('circle').attr('r', 16).attr('fill', 'var(--bark)');
    root
      .append('text')
      .attr('x', -22)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-weight', 700)
      .text('Wizor');

    // Troncos y ramas
    const grp = node.filter((d) => d.data.kind === 'trunk' || d.data.kind === 'branch');
    grp
      .append('circle')
      .attr('r', (d) => (d.data.kind === 'trunk' ? 9 : 6))
      .attr('fill', 'var(--surface)')
      .attr('stroke', 'var(--bark)')
      .attr('stroke-width', (d) => (d.data.kind === 'trunk' ? 4 : 3));
    grp
      .append('text')
      .attr('x', (d) => (d.data.kind === 'trunk' ? 14 : 11))
      .attr('dy', (d) => (d.children ? '-0.75em' : '0.35em'))
      .attr('font-weight', (d) => (d.data.kind === 'trunk' ? 700 : 600))
      .attr('font-size', (d) => (d.data.kind === 'trunk' ? 14 : 13))
      .text((d) => d.data.name);
    grp
      .append('text')
      .attr('class', 'sub')
      .attr('x', (d) => (d.data.kind === 'trunk' ? 14 : 11))
      .attr('dy', (d) => (d.children ? '1.45em' : '1.75em'))
      .text((d) => {
        const active = d.data.leaves.filter((l) => l.stage !== 'perdido' && l.stage !== 'pausado');
        const s = activeAmount(d.data.leaves);
        const label = `${active.length} ${active.length === 1 ? t('tree.leaf') : t('tree.leaves')}`;
        const amt = showMoney && s ? ', ' + money(s) : '';
        const hint = d.children ? '' : ', ' + t('tree.tapToOpen');
        return label + amt + hint;
      });
    grp.style('cursor', 'pointer').on('click', (_e, d) => d.data.key && onToggle(d.data.key));

    // Hojas
    const urgencyColor: Record<string, string> = {
      late: 'var(--danger)',
      soon: 'var(--warn)',
      ok: 'var(--ok)',
      far: 'var(--accent)',
      none: 'var(--line)',
    };
    const leafColor = (it: ItemWithId) =>
      colorBy === 'stage' ? stageColor(it.stage) : urgencyColor[urgency(it)];

    const lf = node.filter((d) => d.data.kind === 'leaf');
    lf.append('circle')
      .attr('r', (d) => (showMoney ? rScale(d.data.it!.amount1 || 0) : 7))
      .attr('fill', (d) => leafColor(d.data.it!))
      .attr('stroke', (d) => {
        const u = urgency(d.data.it!);
        if (colorBy === 'stage' && u === 'late') return 'var(--danger)';
        if (colorBy === 'stage' && u === 'soon') return 'var(--warn)';
        return 'var(--surface)';
      })
      .attr('stroke-width', (d) =>
        colorBy === 'stage' && ['late', 'soon'].includes(urgency(d.data.it!)) ? 3 : 1.5,
      )
      .attr('stroke-dasharray', (d) => (d.data.it!.amount1 == null && showMoney ? '2 2' : null));
    lf.append('text')
      .attr('x', 20)
      .attr('dy', '-0.1em')
      .attr('font-size', 13.5)
      .attr('font-weight', 600)
      .text((d) => d.data.name);
    lf.append('text')
      .attr('class', 'sub')
      .attr('x', 20)
      .attr('dy', '1.1em')
      .text((d) => {
        const it = d.data.it!;
        const u = urgency(it);
        const dd = daysTo(it.deadline);
        const when =
          u === 'late'
            ? t('tree.overdueBy', { days: -(dd ?? 0) })
            : it.deadline
              ? t('tree.dueOn', { date: fmtD(it.deadline) })
              : t('tree.noDate');
        const owners = (it.owners || []).length ? ', ' + it.owners.join(', ') : '';
        return `${stageLabel(it.stage)}, ${when}${owners}`;
      });
    lf.attr('tabindex', 0)
      .style('cursor', 'pointer')
      .on('click', (_e, d) => onSelect(d.data.it!.id))
      .on('keydown', (e, d) => {
        if ((e as KeyboardEvent).key === 'Enter') onSelect(d.data.it!.id);
      });

    // Selección y resaltado
    const emphasize = selectedId ?? highlightId ?? null;
    if (emphasize) {
      lf.classed('dim', (d) => d.data.it!.id !== emphasize);
      lf.filter((d) => d.data.it!.id === emphasize)
        .select('circle')
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 3);
    }
  }, [
    items,
    colorBy,
    collapsed,
    onToggle,
    onSelect,
    selectedId,
    showMoney,
    highlightId,
    t,
    i18n.resolvedLanguage,
  ]);

  return <div className="treeBox" ref={boxRef} />;
}
