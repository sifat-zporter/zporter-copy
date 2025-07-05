export function getYouTubeId(url: string) {
  // const [a, , b] = url
  //   .replace(/(>|<)/gi, '')
  //   .split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  // if (b !== undefined) {
  //   return b.split(/[^0-9a-z_-]/i)[0];
  // } else {
  //   return a;
  // }
  // Our regex pattern to look for a youTube ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  //Match the url with the regex
  const match = url.match(regExp);
  //Return the result
  return match && match[2].length === 11 ? match[2] : undefined;
}
