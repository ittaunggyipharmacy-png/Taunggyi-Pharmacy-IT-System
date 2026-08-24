import { supabase } from '../../lib/supabase';

const USER_DATALIST_ID = 'it-asset-assignee-users';
const ASSET_SEARCH_MARK = 'data-asset-search-enhanced';

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
    .filter(Boolean)
    .map(normalize)
    .join(' ');
  return metadata.includes('assigned to') || metadata.includes('assigned_to') || getParentLabelText(input).includes('assigned to');
};

const ensureUserDatalist = async (input: HTMLInputElement) => {
  let datalist = document.getElementById(USER_DATALIST_ID) as HTMLDataListElement | null;
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = USER_DATALIST_ID;
    document.body.appendChild(datalist);
  }

  if (datalist.dataset.loaded !== 'true') {
    const [{ data: users }, { data: people }] = await Promise.all([
      supabase.from('app_users').select('uid,display_name,employee_id,department,branch,position').order('display_name'),
      supabase.from('asset_people').select('id,full_name,employee_id,department,branch,position').order('full_name'),
    ]);

    const values = new Map<string, string>();
    (users || []).forEach((user: any) => {
      const name = String(user.display_name || '').trim();
      if (!name) return;
      const meta = [user.employee_id, user.department, user.branch, user.position].filter(Boolean).join(' · ');
      values.set(name, meta ? `${name} · ${meta}` : name);
    });
    (people || []).forEach((person: any) => {
      const name = String(person.full_name || '').trim();
      if (!name || values.has(name)) return;
      const meta = [person.employee_id, person.department, person.branch, person.position].filter(Boolean).join(' · ');
      values.set(name, meta ? `${name} · ${meta}` : name);
    });

    datalist.replaceChildren(...Array.from(values.entries()).map(([name, label]) => {
      const option = document.createElement('option');
      option.value = name;
      option.label = label;
      return option;
    }));
    datalist.dataset.loaded = 'true';
  }

  input.setAttribute('list', USER_DATALIST_ID);
  input.placeholder = 'Search user name / employee ID...';
  input.dataset.assignmentUserEnhanced = 'true';
};

const enhanceAssignedToInputs = () => {
  document.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    if (input.dataset.assignmentUserEnhanced === 'true' || !isAssignedToInput(input)) return;
    void ensureUserDatalist(input);
  });
};

const assetOptionText = (option: HTMLOptionElement) => normalize(`${option.textContent} ${option.value}`);

const enhanceAssetAssignmentSelects = () => {
  document.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
    if (select.dataset.assetSearchEnhanced === 'true') return;
    const options = Array.from(select.options);
    const isAssetPicker = options.some(option => normalize(option.textContent).includes('select available asset'));
    if (!isAssetPicker) return;

    const wrapper = select.parentElement;
    if (!wrapper) return;

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search asset code / name / category / serial...';
    search.className = 'mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
    search.setAttribute('aria-label', 'Search available assets');

    search.addEventListener('input', () => {
      const term = normalize(search.value);
      Array.from(select.options).forEach((option, index) => {
        if (index === 0) {
          option.hidden = false;
          return;
        }
        option.hidden = Boolean(term) && !assetOptionText(option).includes(term);
      });
    });

    wrapper.insertBefore(search, select);
    select.dataset.assetSearchEnhanced = 'true';
  });
};

let observer: MutationObserver | null = null;
let refreshTimer: number | null = null;

export const installAssetAssignmentUiEnhancer = () => {
  if (typeof window === 'undefined' || observer) return;

  const run = () => {
    enhanceAssignedToInputs();
    enhanceAssetAssignmentSelects();
  };

  run();
  observer = new MutationObserver(() => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(run, 50);
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
