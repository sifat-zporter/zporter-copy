import { db } from "../config/firebase.config";

export const getDocumentsList = async (ids: string[], collection: string): Promise<any[]> => {
    if (!ids || ids.length === 0 || !Array.isArray(ids) || !collection) {
        return [];
    }

    const queryRef = db.collection(collection).where('__name__', 'in', ids);
    const querySnapshot = await queryRef.get();

    if (querySnapshot.empty) {
        return [];
    }

    const documentsList: any[] = [];
    querySnapshot.forEach(doc => {
        const documentData = doc.data();
        documentData.id = doc.id;
        documentsList.push(documentData);
    });

    return documentsList;
}