const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

const targetGroup = `  const groupedByUser = useMemo(() => {
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

const replaceGroup = `  const groupedByDepartment = useMemo(() => {
    const groups = new Map<string, any[]>();
    filteredAssets.forEach(asset => {
      const dept = (asset.department && asset.department.trim() !== "") ? asset.department : 'Unassigned / Stock';
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept).push(asset);
    });

    const deptOrder: Record<string, number> = {
      "IT": 1,
      "Admin": 2,
      "HR": 3,
      "Finance": 4,
      "Wholesale": 5,
      "CMD": 6,
      "Shop 1": 7,
      "Shop 2": 8,
      "Shop 3": 9
    };

    const getDeptPriority = (dept: string) => {
      if (dept === 'Unassigned / Stock') return 9999;
      if (deptOrder[dept]) return deptOrder[dept];
      if (dept.toLowerCase().startsWith("shop ")) {
          const num = parseInt(dept.replace(/[^0-9]/g, ''), 10);
          return 100 + (isNaN(num) ? 99 : num);
      }
      return 999;
    };

    return Array.from(groups.entries())
      .sort(([deptA], [deptB]) => {
        const pA = getDeptPriority(deptA);
        const pB = getDeptPriority(deptB);
        if (pA !== pB) return pA - pB;
        return deptA.localeCompare(deptB);
      })
      .map(([label, items]) => ({ label, items }));
  }, [filteredAssets]);`;

code = code.replace(targetGroup, replaceGroup);
code = code.replace(/groupedByUser/g, 'groupedByDepartment');

fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
