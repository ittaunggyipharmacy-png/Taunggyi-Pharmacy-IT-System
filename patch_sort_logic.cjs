const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');
const target = `    rawFilteredAssets.forEach(asset => {
      if (asset.parentId && map.has(asset.parentId)) {
        if (!childrenMap.has(asset.parentId)) {
          childrenMap.set(asset.parentId, []);
        }
        childrenMap.get(asset.parentId)!.push(asset);
      } else {
        roots.push(asset);
      }
    });

    const result: any[] = [];
    const addAsset = (asset: any) => {
      result.push(asset);
      const children = childrenMap.get(asset.id);
      if (children) {
        children.forEach(child => addAsset(child));
      }
    };

    roots.forEach(root => addAsset(root));`;

const replace = `    rawFilteredAssets.forEach(asset => {
      if (asset.parentId && map.has(asset.parentId)) {
        if (!childrenMap.has(asset.parentId)) {
          childrenMap.set(asset.parentId, []);
        }
        childrenMap.get(asset.parentId)!.push(asset);
      } else {
        roots.push(asset);
      }
    });

    const categoryPriority: Record<string, number> = {
      "Computer": 1,
      "Keyboard": 2,
      "Mouse": 3,
      "Fan": 4,
      "USB Hub": 5,
      "Printer": 6,
      "Scanner": 7
    };

    const getSortValue = (asset: any) => {
      if (typeof asset.displayOrder === 'number') return asset.displayOrder;
      return (categoryPriority[asset.category] || 99) * 1000;
    };

    const sortAssets = (a: any, b: any) => getSortValue(a) - getSortValue(b);

    roots.sort(sortAssets);
    childrenMap.forEach(children => children.sort(sortAssets));

    const result: any[] = [];
    const addAsset = (asset: any) => {
      result.push(asset);
      const children = childrenMap.get(asset.id);
      if (children) {
        children.forEach(child => addAsset(child));
      }
    };

    roots.forEach(root => addAsset(root));`;

code = code.replace(target, replace);
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
