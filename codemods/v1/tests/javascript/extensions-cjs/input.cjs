async function create() {
  const { objectid: makeObjectId } = await import('uniku/objectid')
  return makeObjectId({ secs: 1 })
}

module.exports = { create }
