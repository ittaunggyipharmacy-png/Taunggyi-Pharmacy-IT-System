const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');
const target = `  const filteredAssets = displayedAssets.filter(asset => {`;
const replace = `  const rawFilteredAssets = displayedAssets.filter(asset => {`;
code = code.replace(target, replace);
const append = `
  const filteredAssets = useMemo(() => {
    const map = new Map<string, any>();
    const childrenMap = new Map<string, any[]>();
    const roots: any[] = [];

    rawFilteredAssets.forEach(asset => {
      map.set(asset.id, asset);
    });

    rawFilteredAssets.forEach(asset => {
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

    roots.forEach(root => addAsset(root));
    return result;
  }, [rawFilteredAssets]);
`;
const insertPos = code.indexOf(`const currentAssets = filteredAssets.filter`);
code = code.slice(0, insertPos) + append + "\n  " + code.slice(insertPos);
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
