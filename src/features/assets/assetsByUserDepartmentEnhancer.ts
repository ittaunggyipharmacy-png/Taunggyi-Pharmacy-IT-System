import { supabase } from '../../lib/supabase';

type AssetDepartment = { id: string; code: string; department: string };

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

const loadAssetDepartments = async (): Promise<AssetDepartment[]> => {
  const { data, error } = await supabase.from('assets').select('id,code,department');
  if (error) throw error;
  return (data || [])
    .filter((asset: any) => asset?.id && String(asset.department || '').trim())
    .map((asset: any) => ({ id: String(asset.id), code: String(asset.code || '').trim(), department: String(asset.department).trim() }));
};

const findAssignedAssetsPanel = (): HTMLElement | null => {
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h2'));
  const heading = headings.find(el => normalize(el.textContent) === 'assigned assets');
  return heading?.closest('div.rounded-3xl') as HTMLElement | null;
};

const installDepartmentFilter = async (panel: HTMLElement) => {
  if (panel.dataset.departmentFilterInstalled === 'true') return;
  const header = panel.querySelector(':scope > div.border-b');
  if (!header) return;

  const assets = await loadAssetDepartments();
  const departments = Array.from(new Set(assets.map(asset => asset.department))).sort((a, b) => a.localeCompare(b));
  if (!departments.length) return;

  const assetDepartmentByCode = new Map(assets.filter(asset => asset.code).map(asset => [normalize(asset.code), normalize(asset.department)]));
  const control = document.createElement('div');
  control.className = 'flex items-center gap-2';

  const label = document.createElement('span');
  label.className = 'text-xs font-medium text-slate-500';
  label.textContent = 'Department';

  const select = document.createElement('select');
  select.className = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500';
  select.setAttribute('aria-label', 'Filter assigned assets by department');

  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All Departments';
  select.appendChild(all);
  departments.forEach(department => {
    const option = document.createElement('option');
    option.value = department;
    option.textContent = department;
    select.appendChild(option);
  });

  const applyFilter = () => {
    const selected = normalize(select.value);
    const list = panel.querySelector(':scope > div.divide-y') as HTMLElement | null;
    if (!list) return;
    Array.from(list.children).forEach(row => {
      const element = row as HTMLElement;
      const assetCode = normalize(element.querySelector('span.font-semibold')?.textContent || '');
      const department = assetDepartmentByCode.get(assetCode) || '';
      element.hidden = Boolean(selected) && department !== selected;
    });
  };

  select.addEventListener('change', applyFilter);
  control.append(label, select);
  header.classList.add('flex', 'flex-col', 'gap-3', 'sm:flex-row', 'sm:items-center', 'sm:justify-between');
  header.appendChild(control);
  panel.dataset.departmentFilterInstalled = 'true';
};

let observer: MutationObserver | null = null;
let timer: number | null = null;

export const installAssetsByUserDepartmentFilter = () => {
  if (typeof window === 'undefined' || observer) return;
  const run = () => {
    const panel = findAssignedAssetsPanel();
    if (panel) void installDepartmentFilter(panel).catch(console.error);
  };
  run();
  observer = new MutationObserver(() => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(run, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
