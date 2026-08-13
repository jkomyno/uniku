async function create() {
  const { objectid } = await import('uniku/objectid')
  return objectid({ secs: 2 })
}

module.exports = { create }
