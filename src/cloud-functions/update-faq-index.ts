// import * as functions from 'firebase-functions';
// import { elasticClient } from '../config/elastic.config';

// export const createFAQIndex = functions
//   .region(process.env.REGION)
//   .firestore.document('faqs/{faqId}')
//   .onCreate(async (change, context) => {
//     const faq = change.data();

//     const id = context.params.faqId;

//     const topics = faq.topics as string[];

//     if (topics.length) {
//       const mappingCreateIndexes = topics.map(
//         async (topic) =>
//           await elasticClient.index({
//             index: `faq-${topic.toLowerCase()}`,
//             id,
//             body: faq,
//           }),
//       );

//       await Promise.all(mappingCreateIndexes);
//     }

//     console.log('create faq index success');

//     return;
//   });

// export const updateFAQIndex = functions
//   .region(process.env.REGION)
//   .firestore.document('faqs/{faqId}')
//   .onUpdate(async (change, context) => {
//     const oldFAQ = change.before.data();

//     const newFAQ = change.after.data();

//     const id = context.params.faqId;

//     const oldTopics = oldFAQ.topics as string[];

//     const newTopics = newFAQ.topics as string[];

//     if (oldTopics.length) {
//       const mappingDeleteOldIndexes = oldTopics.map(
//         async (topic) =>
//           await elasticClient.delete({
//             index: `faq-${topic.toLowerCase()}`,
//             id,
//           }),
//       );

//       await Promise.all(mappingDeleteOldIndexes);
//     }

//     if (newTopics.length) {
//       const mappingCreateIndexes = newTopics.map(
//         async (topic) =>
//           await elasticClient.index({
//             index: `faq-${topic.toLowerCase()}`,
//             id,
//             body: newFAQ,
//           }),
//       );

//       await Promise.all(mappingCreateIndexes);
//     }

//     console.log('update faq index success');

//     return;
//   });

// export const deleteFAQIndex = functions
//   .region(process.env.REGION)
//   .firestore.document('faqs/{faqId}')
//   .onDelete(async (change, context) => {
//     const faq = change.data();

//     const id = context.params.clubId;

//     const topics = faq.topics as string[];

//     if (topics.length) {
//       const mappingDeleteOldIndexes = topics.map(
//         async (topic) =>
//           await elasticClient.delete({
//             index: `faq-${topic.toLowerCase()}`,
//             id,
//           }),
//       );

//       await Promise.all(mappingDeleteOldIndexes);
//     }

//     console.log('delete faq index success');

//     return;
//   });
