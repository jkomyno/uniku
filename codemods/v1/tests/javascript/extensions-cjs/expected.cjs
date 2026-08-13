async function create() {
  const { objectid: makeObjectId } = await import('uniku/objectid')
  return makeObjectId({ msecs: 1 * 1000 })
}

module.exports = { create }
