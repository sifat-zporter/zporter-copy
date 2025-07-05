export function deleteNullValuesInArray<T>(array: Array<T>): Array<T> {
  return array.filter((el) => el);
}
