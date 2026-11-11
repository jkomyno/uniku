interface Props {
  error?: { code: string; strategy?: string }
}

export function ErrorBadge({ error }: Props): JSX.Element {
  return <strong>{error?.code === 'UUID_INVALID_SEPARATORS' ? 'bad' : 'ok'}</strong>
}
