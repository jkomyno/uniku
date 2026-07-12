import { create } from '@orama/orama'
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static'
import { useDocsSearch } from 'fumadocs-core/search/client'
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'

function initOrama() {
  return create({
    language: 'english',
    schema: { _: 'string' },
  })
}

export default function DocsSearch(props: SharedProps) {
  const { query, search, setSearch } = useDocsSearch({
    client: oramaStaticClient({ initOrama }),
  })

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  )
}
