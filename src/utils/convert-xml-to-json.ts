import { parseString } from 'xml2js';

export const convertXML2Json = (xml: string) => {
  let parsedXml = {};
  parseString(
    xml,
    {
      explicitArray: false,
      trim: true,
      emptyTag: null,
      explicitRoot: false,
      mergeAttrs: true,
    },
    (err, result) => {
      parsedXml = result;
    },
  );
  return parsedXml;
};
