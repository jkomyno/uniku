async function create() {
  const { objectid } = await import('uniku/objectid')
  return objectid({ msecs: 2 * 1000 })
}

module.exports = { create }
