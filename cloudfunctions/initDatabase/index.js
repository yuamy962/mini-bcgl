const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = ['patients', 'timeline', 'indicators', 'reminders', 'familyMembers', 'operations'];

exports.main = async (event, context) => {
  const results = [];
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      results.push({ name, status: 'created' });
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        results.push({ name, status: 'existed' });
      } else {
        results.push({ name, status: 'error', msg: err.message });
      }
    }
  }
  return { results };
};
