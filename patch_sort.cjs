const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

const target1 = `  const currentAssets = filteredAssets.filter(a => !isHistorical(a.purchaseDate));
  const historicalAssets = filteredAssets.filter(a => isHistorical(a.purchaseDate));`;

const replace1 = `  const groupedByUser = useMemo(() => {
    const groups = new Map<string, any[]>();
    filteredAssets.forEach(asset => {
      const user = (asset.assignedTo && asset.assignedTo !== "Unassigned") ? asset.assignedTo : 'Unassigned / Stock';
      if (!groups.has(user)) groups.set(user, []);
      groups.get(user).push(asset);
    });

    return Array.from(groups.entries())
      .sort(([userA], [userB]) => {
        if (userA === 'Unassigned / Stock') return 1;
        if (userB === 'Unassigned / Stock') return -1;
        return userA.localeCompare(userB);
      })
      .map(([label, items]) => ({ label, items }));
  }, [filteredAssets]);`;

code = code.replace(target1, replace1);

const target2 = `                [
                  { label: "Current Assets", items: currentAssets },
                  { label: "Historical Records (>30 days)", items: historicalAssets }
                ].map((group) => (`;

const replace2 = `                groupedByUser.map((group) => (`;

code = code.replace(target2, replace2);

fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
