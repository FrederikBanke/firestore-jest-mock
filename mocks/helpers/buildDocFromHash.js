const timestamp = require('../timestamp');

module.exports = function buildDocFromHash(hash = {}, id = 'abc123', selectFields = undefined) {
  const exists = !!hash || false;
  return {
    createTime: (hash && hash._createTime) || timestamp.Timestamp.now(),
    exists,
    id: (hash && hash.id) || id,
    readTime: hash && hash._readTime,
    ref: hash && hash._ref,
    metadata: {
      hasPendingWrites: 'Server',
    },
    updateTime: hash && hash._updateTime,
    data() {
      if (!exists) {
        // From Firestore docs: "Returns 'undefined' if the document doesn't exist."
        // See https://firebase.google.com/docs/reference/js/firestore_.documentsnapshot#documentsnapshotdata
        return undefined;
      }
      let copy = { ...hash };
      if (!hash._ref.parent.firestore.options.includeIdsInData) {
        delete copy.id;
      }
      delete copy._collections;
      delete copy._createTime;
      delete copy._readTime;
      delete copy._ref;
      delete copy._updateTime;
      delete copy._converter;

      if (selectFields !== undefined) {
        copy = Object.keys(copy)
          .filter(key => key === 'id' || selectFields.includes(key))
          .reduce((res, key) => ((res[key] = copy[key]), res), {});
      }
      return hash._converter ? hash._converter.fromFirestore({ data: () => copy }) : copy;
    },
    get(fieldPath) {
      // The field path can be compound: from the firestore docs
      //  fieldPath The path (e.g. 'foo' or 'foo.bar') to a specific field.
      const parts = fieldPath.split('.');
      const data = this.data();
      return parts.reduce((acc, part, index) => {
        const value = acc[part];
        // if no key is found
        if (value === undefined) {
          // return null if we are on the last item in parts
          // otherwise, return an empty object, so we can continue to iterate
          return parts.length - 1 === index ? null : {};
        }

        // if there is a value, return it
        return value;
      }, data);
    },
  };
};
