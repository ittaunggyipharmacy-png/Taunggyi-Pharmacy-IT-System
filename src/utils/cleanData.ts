export const cleanData = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};
