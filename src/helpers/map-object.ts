export const mapArrayObject = (data: any[], newKey: string, oldKey: string) => {
  return data.forEach((e) => {
    if (e[newKey] === undefined) {
      if (oldKey !== newKey) {
        e[newKey] = e[oldKey];
        delete e[oldKey];
      }
    }
  });
};
