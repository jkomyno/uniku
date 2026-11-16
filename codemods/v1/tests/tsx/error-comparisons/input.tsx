interface Props {
  error: { code: string; strategy?: string }
}

export function ErrorBadge({ error }: Props): JSX.Element | null {
  return error.code === 'CUID2_LENGTH_OUT_OF_RANGE' ? <strong>Invalid length</strong> : null
}
