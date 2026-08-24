import { supabase } from '../../lib/supabase';

const USER_DATALIST_ID = 'it-asset-assignee-users';

type AssignmentUser = {
  name: string;
  employeeId?: string;
  department?: string;
  branch?: string;
  position?: string;
};

type AssignmentAsset = {
  id: string;
  code?: string;
  name?: string;
  category?: string;
  serialNumber?: string;
  department?: string;
  branch?: string;
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

const getParentLabelText = (element: HTMLElement) => {
  let parent: HTMLElement | null = element.parentElement;
  for (let depth = 0; depth < 4 && parent; depth += 1) {
    const text = normalize(parent.textContent);
    if (text.includes('assigned to')) return text;
    parent = parent.parentElement;
  }
  return '';
};

const isAssignedToInput = (input: HTMLInputElement) => {
  const metadata = [input.name, input.id, input.placeholder, input.getAttribute('aria-label'), input.getAttribute('title')]
    .filter(Boolean).map(normalize).join(' ');
  return metadata.includes('assigned to') || metadata.includes('assigned_to') || getParentLabelText(input).includes('assigned to');
};

const loadAssignmentUsers = async (): Promise<AssignmentUser[]> => {
  const [{ data: users }, { data: people }] = await Promise.all([
    supabase.from('app_users').select('uid,display_name,employee_id,department,branch,position').order('display_name'),
    supabase.from('asset_people').select('id,full_name,employee_id,department,branch,position').order('full_name'),
  ]);

  const values = new Map<string, AssignmentUser>();
  (users || []).forEach((user: any) => {
    const name = String(user.display_name || '').trim();
    if (!name) return;
    values.set(name, { name, employeeId: user.employee_id || undefined, department: user.department || undefined, branch: user.branch || undefined, position: user.position || undefined });
  });
  (people || []).forEach((person: any) => {
    const name = String(person.full_name || '').trim();
    if (!name || values.has(name)) return;
    values.set(name, { name, employeeId: person.employee_id || undefined, department: person.department || undefined, branch: person.branch || undefined, position: person.position || undefined });
  });
  return Array.from(values.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getUserDepartments = (users: AssignmentUser[]) => Array.from(new Set(users.map(user => String(user.department || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
const getUserOptionLabel = (user: AssignmentUser) => [user.employeeId, user.department, user.branch, user.position].filter(Boolean).join(' · ');

const renderUserOptions = (datalist: HTMLDataListElement, users: AssignmentUser[], department = '') => {
  const selectedDepartment = normalize(department);
  const filtered = selectedDepartment ? users.filter(user => normalize(user.department) === selectedDepartment) : users;
  datalist.replaceChildren(...filtered.map(user => {
    const option = document.createElement('option');
    option.value = user.name;
    const label = getUserOptionLabel(user);
    if (label) option.label = label;
    return option;
  }));
};

const ensureUserSearch = async (input: HTMLInputElement) => {
  if (input.dataset.assignmentUserEnhanced === 'true') return;
  let datalist = document.getElementById(USER_DATALIST_ID) as HTMLDataListElement | null;
  if (!datalist) { datalist = document.createElement('datalist'); datalist.id = USER_DATALIST_ID; document.body.appendChild(datalist); }

  let users = (window as any).__assetAssignmentUsers as AssignmentUser[] | undefined;
  if (!users) { users = await loadAssignmentUsers(); (window as any).__assetAssignmentUsers = users; }
  renderUserOptions(datalist, users);

  const departmentSelect = document.createElement('select');
  departmentSelect.className = 'mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500';
  departmentSelect.setAttribute('aria-label', 'Search users by department');
  departmentSelect.dataset.assetUserDepartmentFilter = 'true';
  const allOption = document.createElement('option'); allOption.value = ''; allOption.textContent = 'All Departments'; departmentSelect.appendChild(allOption);
  getUserDepartments(users).forEach(department => { const option = document.createElement('option'); option.value = department; option.textContent = department; departmentSelect.appendChild(option); });
  departmentSelect.addEventListener('change', () => { renderUserOptions(datalist!, users!, departmentSelect.value); input.value = ''; });

  input.setAttribute('list', USER_DATALIST_ID);
  input.placeholder = 'Search user name / employee ID / department...';
  input.dataset.assignmentUserEnhanced = 'true';
  input.parentElement?.insertBefore(departmentSelect, input);
};

const enhanceAssignedToInputs = () => {
  document.querySelectorAll<HTMLInputElement>('input').forEach(input => {
    if (input.dataset.assignmentUserEnhanced === 'true' || !isAssignedToInput(input)) return;
    void ensureUserSearch(input);
  });
};

const loadAssignmentAssets = async (): Promise<AssignmentAsset[]> => {
  const { data } = await supabase.from('assets').select('id,code,name,category,serial_number,department,branch').order('code');
  return (data || []).map((asset: any) => ({
    id: String(asset.id), code: asset.code || undefined, name: asset.name || undefined, category: asset.category || undefined,
    serialNumber: asset.serial_number || undefined, department: asset.department || undefined, branch: asset.branch || undefined,
  }));
};

const assetOptionText = (option: HTMLOptionElement) => normalize(`${option.textContent} ${option.value}`);

const enhanceAssetAssignmentSelects = async () => {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
  for (const select of selects) {
    if (select.dataset.assetSearchEnhanced === 'true') continue;
    const options = Array.from(select.options);
    const isAssetPicker = options.some(option => normalize(option.textContent).includes('select available asset'));
    if (!isAssetPicker) continue;
    const wrapper = select.parentElement;
    if (!wrapper) continue;

    let assets = (window as any).__assetAssignmentAssets as AssignmentAsset[] | undefined;
    if (!assets) { assets = await loadAssignmentAssets(); (window as any).__assetAssignmentAssets = assets; }
    const byId = new Map(assets.map(asset => [asset.id, asset]));
    options.forEach((option, index) => {
      if (index === 0) return;
      const asset = byId.get(String(option.value));
      if (!asset) return;
      const extra = [asset.department, asset.branch].filter(Boolean).join(' · ');
      if (extra && !normalize(option.textContent).includes(normalize(extra))) option.textContent = `${option.textContent} · ${extra}`;
    });

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search asset code / name / category / serial / department...';
    search.className = 'mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
    search.setAttribute('aria-label', 'Search available assets by code, name, serial, or department');
    search.addEventListener('input', () => {
      const term = normalize(search.value);
      Array.from(select.options).forEach((option, index) => {
        if (index === 0) { option.hidden = false; return; }
        option.hidden = Boolean(term) && !assetOptionText(option).includes(term);
      });
    });
    wrapper.insertBefore(search, select);
    select.dataset.assetSearchEnhanced = 'true';
  }
};

let observer: MutationObserver | null = null;
let refreshTimer: number | null = null;

export const installAssetAssignmentUiEnhancer = () => {
  if (typeof window === 'undefined' || observer) return;
  const run = () => { void enhanceAssignedToInputs(); void enhanceAssetAssignmentSelects(); };
  run();
  observer = new MutationObserver(() => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(run, 50);
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
