import { elasticClient } from '../config/elastic.config';

export class DeleteNotFoundDocumentIndexDto {
  documentId: string;
  indexName: string;
}

export async function deleteNotFoundDocumentIndex(
  deleteNotFoundDocumentIndexDto: DeleteNotFoundDocumentIndexDto,
) {
  const { indexName, documentId } = deleteNotFoundDocumentIndexDto;

  try {
    const searchRes = await elasticClient.get({
      index: indexName,
      id: documentId,
    });

    if (searchRes.statusCode === 404) {
      return;
    }

    if (searchRes.statusCode === 200) {
      await elasticClient.delete({
        index: indexName,
        id: documentId,
      });
    }
  } catch (error) {
    console.log(error);

    if (error.meta.statusCode === 404) return;
  }
}
